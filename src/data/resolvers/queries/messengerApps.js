import { MessengerApps } from '../../../db/models';
import { moduleRequireLogin } from '../../permissions';

const messengerAppQueries = {
  /*
   * MessengerApps list
   */
  messengerApps(root, { kind }) {
    const query = {};

    if (kind) {
      query.kind = kind;
    }

    return MessengerApps.find(query);
  },
};

moduleRequireLogin(messengerAppQueries);

export default messengerAppQueries;
