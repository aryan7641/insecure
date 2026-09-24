const cron = require('node-cron');
const { processRenewalReminders } = require('./renewalReminder.job');

function startScheduler() {
  // Run daily at 6:00 AM IST (00:30 UTC)
  cron.schedule('30 0 * * *', async () => {
    console.log('[Scheduler] Running renewal reminder job...');
    try {
      const result = await processRenewalReminders();
      console.log('[Scheduler] Renewal reminders processed:', result);
    } catch (error) {
      console.error('[Scheduler] Renewal reminder job failed:', error);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[Scheduler] Background jobs scheduled');
}

module.exports = { startScheduler };
