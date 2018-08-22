/* eslint-env jest */
/* eslint-disable no-underscore-dangle */

import faker from 'faker';
import bcrypt from 'bcrypt';
import { connect, disconnect, graphqlRequest } from '../db/connection';
import { Users, Channels, Brands } from '../db/models';
import { userFactory, channelFactory, brandFactory } from '../db/factories';
import utils from '../data/utils';

beforeAll(() => connect());

afterAll(() => disconnect());

/*
 * Generated test data
 */
const args = {
  username: faker.internet.userName(),
  email: faker.internet.email(),
  details: {
    avatar: faker.image.avatar(),
    fullName: faker.name.findName(),
    position: faker.name.jobTitle(),
    location: faker.address.streetName(),
    description: faker.random.word(),
  },
  links: {
    linkedIn: faker.internet.userName(),
    twitter: faker.internet.userName(),
    facebook: faker.internet.userName(),
    github: faker.internet.userName(),
    youtube: faker.internet.userName(),
    website: faker.internet.url(),
  },
  password: 'pass',
};

const toJSON = value => {
  return JSON.stringify(value);
};

describe('User mutations', () => {
  let _user;
  let _admin;
  let _channel;
  let _brand;

  let context;

  const commonParamDefs = `
    $username: String!
    $email: String!
    $role: String!
    $details: UserDetails
    $links: UserLinks
    $channelIds: [String]
    $password: String!
    $passwordConfirmation: String!
  `;

  const commonParams = `
    username: $username
    email: $email
    role: $role
    details: $details
    links: $links
    channelIds: $channelIds
    password: $password
    passwordConfirmation: $passwordConfirmation
  `;

  beforeEach(async () => {
    // Creating test data
    _user = await userFactory();
    _admin = await userFactory({ role: 'admin' });
    _channel = await channelFactory();
    _brand = await brandFactory();

    context = { user: _user };
  });

  afterEach(async () => {
    // Clearing test data
    await Users.remove({});
    await Brands.remove({});
    await Channels.remove({});
  });

  test('Login', async () => {
    const mutation = `
      mutation login($email: String! $password: String!) {
        login(email: $email password: $password) {
          token
          refreshToken
        }
      }
    `;

    const user = await graphqlRequest(mutation, 'login', { email: _user.email, password: 'pass' });

    expect(user.token).toBeDefined();
  });

  test('Forgot password', async () => {
    const mutation = `
      mutation forgotPassword($email: String!) {
        forgotPassword(email: $email)
      }
    `;

    await graphqlRequest(mutation, 'forgotPassword', { email: _user.email });

    const user = await Users.findOne({ email: _user.email });

    expect(user.resetPasswordToken).toBeDefined();
  });

  test('Reset password', async () => {
    // create the random token
    const token = 'token';
    const user = await userFactory({});

    await Users.update(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: Date.now() + 86400000,
        },
      },
    );

    const args = {
      token,
      newPassword: 'newPassword',
    };

    const mutation = `
      mutation resetPassword($token: String! $newPassword: String!) {
        resetPassword(token: $token newPassword: $newPassword)
      }
    `;

    await graphqlRequest(mutation, 'resetPassword', args);

    const updatedUser = await Users.findOne({ _id: user._id });

    expect(bcrypt.compare(args.newPassword, updatedUser.password)).toBeTruthy();
  });

  test('Add user', async () => {
    const doc = {
      ...args,
      role: 'contributor',
      passwordConfirmation: 'pass',
      channelIds: [_channel._id],
    };

    const spyEmail = jest.spyOn(utils, 'sendEmail');

    const mutation = `
      mutation usersAdd(${commonParamDefs}) {
        usersAdd(${commonParams}) {
          _id
          username
          email
          role
          details {
            fullName
            avatar
            location
            position
            description
          }
          links {
            linkedIn
            twitter
            facebook
            github
            youtube
            website
          }
        }
      }
    `;

    const user = await graphqlRequest(mutation, 'usersAdd', doc, context);

    const channel = await Channels.findOne({ _id: _channel._id });

    expect(channel.memberIds).toContain(user._id);
    expect(user.username).toBe(doc.username);
    expect(user.email).toBe(doc.email.toLowerCase());
    expect(user.role).toBe(doc.role);
    expect(user.details.fullName).toBe(doc.details.fullName);
    expect(user.details.avatar).toBe(doc.details.avatar);
    expect(user.details.location).toBe(doc.details.location);
    expect(user.details.position).toBe(doc.details.position);
    expect(user.details.description).toBe(doc.details.description);
    expect(user.links.linkedIn).toBe(doc.links.linkedIn);
    expect(user.links.twitter).toBe(doc.links.twitter);
    expect(user.links.facebook).toBe(doc.links.facebook);
    expect(user.links.github).toBe(doc.links.github);
    expect(user.links.youtube).toBe(doc.links.youtube);
    expect(user.links.website).toBe(doc.links.website);

    // send email call
    expect(spyEmail).toBeCalledWith({
      toEmails: [doc.email],
      subject: 'Invitation info',
      template: {
        name: 'invitation',
        data: {
          username: doc.username,
          password: doc.password,
        },
      },
    });
  });

  test('Edit user', async () => {
    const doc = {
      ...args,
      role: 'contributor',
      passwordConfirmation: 'pass',
      channelIds: [_channel._id],
    };

    const mutation = `
      mutation usersEdit($_id: String! ${commonParamDefs}) {
        usersEdit(_id: $_id ${commonParams}) {
          _id
          username
          email
          role
          details {
            fullName
            avatar
            location
            position
            description
          }
          links {
            linkedIn
            twitter
            facebook
            github
            youtube
            website
          }
        }
      }
    `;

    const user = await graphqlRequest(mutation, 'usersEdit', { _id: _user._id, ...doc }, context);

    const channel = await Channels.findOne({ _id: _channel._id });

    expect(channel.memberIds).toContain(user._id);
    expect(user.username).toBe(doc.username);
    expect(user.email.toLowerCase()).toBe(doc.email.toLowerCase());
    expect(user.role).toBe(doc.role);
    expect(user.details.fullName).toBe(doc.details.fullName);
    expect(user.details.avatar).toBe(doc.details.avatar);
    expect(user.details.location).toBe(doc.details.location);
    expect(user.details.position).toBe(doc.details.position);
    expect(user.details.description).toBe(doc.details.description);
    expect(user.links.linkedIn).toBe(doc.links.linkedIn);
    expect(user.links.twitter).toBe(doc.links.twitter);
    expect(user.links.facebook).toBe(doc.links.facebook);
    expect(user.links.github).toBe(doc.links.github);
    expect(user.links.youtube).toBe(doc.links.youtube);
    expect(user.links.website).toBe(doc.links.website);
  });

  test('Edit user profile', async () => {
    const mutation = `
      mutation usersEditProfile(
        $username: String!
        $email: String!
        $details: UserDetails
        $links: UserLinks
        $password: String!
      ) {
        usersEditProfile(
          username: $username
          email: $email
          details: $details
          links: $links
          password: $password
        ) {
          username
          email
          details {
            fullName
            avatar
            location
            position
            description
          }
          links {
            linkedIn
            twitter
            facebook
            github
            youtube
            website
          }
        }
      }
    `;

    const user = await graphqlRequest(mutation, 'usersEditProfile', args, context);

    expect(user.username).toBe(args.username);
    expect(user.email.toLowerCase()).toBe(args.email.toLowerCase());
    expect(user.details.fullName).toBe(args.details.fullName);
    expect(user.details.avatar).toBe(args.details.avatar);
    expect(user.details.location).toBe(args.details.location);
    expect(user.details.position).toBe(args.details.position);
    expect(user.details.description).toBe(args.details.description);
    expect(user.links.linkedIn).toBe(args.links.linkedIn);
    expect(user.links.twitter).toBe(args.links.twitter);
    expect(user.links.facebook).toBe(args.links.facebook);
    expect(user.links.github).toBe(args.links.github);
    expect(user.links.youtube).toBe(args.links.youtube);
    expect(user.links.website).toBe(args.links.website);
  });

  test('Change user password', async () => {
    const args = {
      currentPassword: 'pass',
      newPassword: 'pass1',
    };

    const previousPassword = _user.password;

    const mutation = `
      mutation usersChangePassword(
        $currentPassword: String!
        $newPassword: String!
      ) {
        usersChangePassword(
          currentPassword: $currentPassword
          newPassword: $newPassword
        ) {
          _id
        }
      }
    `;

    await graphqlRequest(mutation, 'usersChangePassword', args, context);

    const user = await Users.findOne({ _id: _user._id });

    expect(user.password).not.toBe(previousPassword);
  });

  test('Remove user', async () => {
    const mutation = `
      mutation usersRemove($_id: String!) {
        usersRemove(_id: $_id)
      }
    `;

    await graphqlRequest(mutation, 'usersRemove', { _id: _user._id }, { user: _admin });

    const deactivedUser = await Users.findOne({ _id: _user._id });

    expect(deactivedUser.isActive).toBe(false);
  });

  test('Config user email signature', async () => {
    const args = [
      {
        signature: faker.random.word(),
        brandId: _brand._id,
      },
    ];

    const mutation = `
      mutation usersConfigEmailSignatures($signatures: [EmailSignature]) {
        usersConfigEmailSignatures(signatures: $signatures) {
          emailSignatures
        }
      }
    `;

    const user = await graphqlRequest(
      mutation,
      'usersConfigEmailSignatures',
      { signatures: args },
      context,
    );

    expect(toJSON(user.emailSignatures)).toEqual(toJSON(args));
  });

  test('Config user get notification by email', async () => {
    const mutation = `
      mutation usersConfigGetNotificationByEmail($isAllowed: Boolean) {
        usersConfigGetNotificationByEmail(isAllowed: $isAllowed) {
          getNotificationByEmail
        }
      }
    `;

    const user = await graphqlRequest(
      mutation,
      'usersConfigGetNotificationByEmail',
      { isAllowed: true },
      context,
    );

    expect(user.getNotificationByEmail).toBeDefined();
  });
});
