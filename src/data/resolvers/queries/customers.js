import { Brands, Tags, Customers, Segments, Forms } from '../../../db/models';
import {
  TAG_TYPES,
  INTEGRATION_KIND_CHOICES,
  COC_CONTENT_TYPES,
  COC_LEAD_STATUS_TYPES,
  COC_LIFECYCLE_STATE_TYPES,
} from '../../constants';
import QueryBuilder from './segmentQueryBuilder';
import { moduleRequireLogin } from '../../permissions';
import { paginate } from './utils';
import BuildQuery from './customerQueryBuilder';
import { cocsExport } from './cocExport';

const sortBuilder = params => {
  const sortField = params.sortField;
  const sortDirection = params.sortDirection;

  let sortParams = { 'messengerData.lastSeenAt': -1 };

  if (sortField) {
    sortParams = { [sortField]: sortDirection };
  }

  return sortParams;
};

const customerQueries = {
  /**
   * Customers list
   * @param {Object} args
   * @return {Promise} filtered customers list by given parameters
   */
  async customers(root, params) {
    const qb = new BuildQuery(params);

    await qb.buildAllQueries();

    const sort = sortBuilder(params);

    return paginate(Customers.find(qb.mainQuery()).sort(sort), params);
  },

  /**
   * Customers for only main list
   * @param {Object} args
   * @return {Promise} filtered customers list by given parameters
   */
  async customersMain(root, params) {
    const qb = new BuildQuery(params);

    await qb.buildAllQueries();

    const sort = sortBuilder(params);

    const list = await paginate(Customers.find(qb.mainQuery()).sort(sort), params);
    const totalCount = await Customers.find(qb.mainQuery()).count();

    return { list, totalCount };
  },

  /**
   * Group customer counts by brands, segments, integrations, tags
   * @param {Object} args
   * @param {CustomerListParams} args.params
   * @return {Object} counts map
   */
  async customerCounts(root, params) {
    const counts = {
      bySegment: {},
      byBrand: {},
      byIntegrationType: {},
      byTag: {},
      byFakeSegment: 0,
      byForm: {},
      byLeadStatus: {},
      byLifecycleState: {},
    };

    const qb = new BuildQuery(params);

    await qb.buildAllQueries();

    let mainQuery = qb.mainQuery();

    // if passed at least one filter other than perPage
    // then find all filtered customers then add subsequent filter to it
    if (Object.keys(params).length > 1) {
      const customers = await Customers.find(qb.mainQuery(), { _id: 1 });
      const customerIds = customers.map(customer => customer._id);

      mainQuery = { _id: { $in: customerIds } };
    }

    const count = query => {
      const findQuery = { $and: [mainQuery, query] };

      return Customers.find(findQuery).count();
    };

    // Count customers by segments
    const segments = await Segments.find({
      contentType: COC_CONTENT_TYPES.CUSTOMER,
    });

    // Count customers by segment
    for (let s of segments) {
      counts.bySegment[s._id] = await count(await qb.segmentFilter(s._id));
    }

    // Count customers by fake segment
    if (params.byFakeSegment) {
      counts.byFakeSegment = await count(QueryBuilder.segments(params.byFakeSegment));
    }

    // Count customers by brand
    const brands = await Brands.find({});

    for (let brand of brands) {
      counts.byBrand[brand._id] = await count(await qb.brandFilter(brand._id));
    }

    // Count customers by integration kind
    for (let kind of INTEGRATION_KIND_CHOICES.ALL) {
      counts.byIntegrationType[kind] = await count(await qb.integrationTypeFilter(kind));
    }

    // Count customers by tag
    const tags = await Tags.find({ type: TAG_TYPES.CUSTOMER });

    for (let tag of tags) {
      counts.byTag[tag._id] = await count(qb.tagFilter(tag._id));
    }

    // Count customers by submitted form
    const forms = await Forms.find({});

    for (let form of forms) {
      counts.byForm[form._id] = await count(
        await qb.formFilter(form._id, params.startDate, params.endDate),
      );
    }

    // Count customers by lead status
    for (let status of COC_LEAD_STATUS_TYPES) {
      counts.byLeadStatus[status] = await count(qb.leadStatusFilter(status));
    }

    // Count customers by life cycle state
    for (let state of COC_LIFECYCLE_STATE_TYPES) {
      counts.byLifecycleState[state] = await count(qb.lifecycleStateFilter(state));
    }

    return counts;
  },

  /**
   * Publishes customers list for the preview
   * when creating/editing a customer segment
   * @param {Object} segment   Segment that's being created/edited
   * @param {Number} [limit=0] Customers limit (for pagination)
   */
  async customerListForSegmentPreview(root, { segment, limit }) {
    const headSegment = await Segments.findOne({ _id: segment.subOf });

    const query = QueryBuilder.segments(segment, headSegment);
    const sort = { 'messengerData.lastSeenAt': -1 };

    return Customers.find(query)
      .sort(sort)
      .limit(limit);
  },

  /**
   * Get one customer
   * @param {Object} args
   * @param {String} args._id
   * @return {Promise} found customer
   */
  customerDetail(root, { _id }) {
    return Customers.findOne({ _id });
  },

  /**
   * Export customers to xls file
   *
   * @param {Object} args - Query params
   * @return {String} File url
   */
  async customersExport(root, params) {
    const qb = new BuildQuery(params);

    await qb.buildAllQueries();

    const sort = sortBuilder(params);

    const customers = await Customers.find(qb.mainQuery()).sort(sort);

    return cocsExport(customers, 'customer');
  },
};

moduleRequireLogin(customerQueries);

export default customerQueries;
