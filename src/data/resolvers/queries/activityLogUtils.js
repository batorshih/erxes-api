import { COC_CONTENT_TYPES } from '../../constants';

const START_DATE = {
  year: 2017,
  month: 0,
};

class BaseMonthActivityBuilder {
  constructor(coc) {
    this.coc = coc;
  }

  /**
   * Get the number of days in the given month
   * @param {int} year - Year
   * @param {int} month - Month [0..11]
   * @return {int} returns number of days in the given month
   */
  getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Generate dates with interval dates used to query ActivityLogs
   * @return {Object} return a list of month objects with yearMonth: { year: int, month: int },
   *                                              interval: { start: Date, year: Date } objects
   */
  generateDates() {
    const now = new Date();

    const endYear = now.getFullYear();
    const endMonth = now.getMonth();

    const monthIntervals = [];

    for (
      let year = START_DATE.year, month = START_DATE.month;
      year < endYear || (year === endYear && month <= endMonth);
      month++
    ) {
      monthIntervals.push({
        yearMonth: {
          year,
          month,
        },
        interval: {
          start: new Date(year, month, 1),
          end: new Date(year, month, this.getDaysInMonth(year, month)),
        },
      });

      if ((month + 1) % 12 == 0) {
        month = 0;
        year++;
      }
    }

    return monthIntervals;
  }

  /**
   * Build month intervals and collect ActivityLogForMonth resolver placeholders into them
   * @return Month interval objects containing activitylogs for that month
   */
  build() {
    const dates = this.generateDates();
    const list = [];

    for (let date of dates) {
      list.unshift({
        coc: this.coc,
        cocContentType: this.cocContentType,
        date,
      });
    }

    return list;
  }
}

// Monthly log builder for customers
export class CustomerMonthActivityLogBuilder extends BaseMonthActivityBuilder {
  constructor(coc) {
    super(coc);
    this.cocContentType = COC_CONTENT_TYPES.CUSTOMER;
  }
}

// Monthly log builder for companies
export class CompanyMonthActivityLogBuilder extends BaseMonthActivityBuilder {
  constructor(coc) {
    super(coc);
    this.cocContentType = COC_CONTENT_TYPES.COMPANY;
  }
}

export default {
  CustomerMonthActivityLogBuilder,
  CompanyMonthActivityLogBuilder,
};