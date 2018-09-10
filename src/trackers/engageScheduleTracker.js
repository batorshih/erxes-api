import schedule from 'node-schedule';
import moment from 'moment';
import { send } from '../data/resolvers/mutations/engageUtils';
import { EngageMessages } from '../db/models';

// Track runtime cron job instances
const ENGAGE_SCHEDULES = [];

/**
 * Create cron job for an engage message
 */
export const createSchedule = message => {
  const { scheduleDate } = message;

  const rule = createScheduleRule(scheduleDate);

  const job = schedule.scheduleJob(rule, () => {
    send(message);
  });

  // Collect cron job instances
  ENGAGE_SCHEDULES.push({ id: message._id, job });
};

/**
 * Create cron job schedule rule
 */
export const createScheduleRule = scheduleDate => {
  if (!scheduleDate || (!scheduleDate.type && !scheduleDate.time)) {
    return '* 45 23 * ';
  }

  const time = moment(scheduleDate.time);

  const hour = time.hour() || '*';
  const minute = time.minute() || '*';
  const month = scheduleDate.month || '*';

  let dayOfWeek = '*';
  let day = '*';

  // Schedule type day of week [0-6]
  if (scheduleDate.type.length === 1) {
    dayOfWeek = scheduleDate.type || '*';
  }

  if (scheduleDate.type === 'month' || scheduleDate.type === 'year') {
    day = scheduleDate.day || '*';
  }

  /*
      *    *    *    *    *    *
    ┬    ┬    ┬    ┬    ┬    ┬
    │    │    │    │    │    │
    │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
    │    │    │    │    └───── month (1 - 12)
    │    │    │    └────────── day of month (1 - 31)
    │    │    └─────────────── hour (0 - 23)
    │    └──────────────────── minute (0 - 59)
    └───────────────────────── second (0 - 59, OPTIONAL)
  */

  return `${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
};

/**
 * Update or Remove selected engage message
 * @param _id - Engage id
 * @param update - Action type
 */
export const updateOrRemoveSchedule = async ({ _id }, update) => {
  const selectedIndex = ENGAGE_SCHEDULES.findIndex(engage => engage.id === _id);

  if (selectedIndex === -1) return;

  // Remove selected job instance and update tracker
  ENGAGE_SCHEDULES[selectedIndex].job.cancel();
  ENGAGE_SCHEDULES.splice(selectedIndex, 1);

  if (!update) return;

  const message = await EngageMessages.findOne({ _id });

  return createSchedule(message);
};
