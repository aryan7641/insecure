const InsurancePolicy = require('../models/InsurancePolicy');
const FollowUp = require('../models/FollowUp');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const Customer = require('../models/Customer');

const processRenewalReminders = async () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 30);
  
  // Create start and end of target day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const policies = await InsurancePolicy.find({
    status: 'active',
    renewalDate: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });

  let processed = 0;
  let created = 0;
  let skipped = 0;

  for (const policy of policies) {
    processed++;
    try {
      const renewalDateStr = policy.renewalDate.toISOString().split('T')[0];
      const renewalEventKey = `policy_${policy._id}_renewal_${renewalDateStr}`;

      const existingFollowUp = await FollowUp.findOne({ renewalEventKey });
      
      if (existingFollowUp) {
        skipped++;
        continue;
      }

      const customer = await Customer.findById(policy.customerId);
      const customerName = customer ? customer.name : 'Unknown';

      const followUp = new FollowUp({
        agencyId: policy.agencyId,
        customerId: policy.customerId,
        agentId: policy.assignedAgentId,
        relatedPolicyId: policy._id,
        type: 'renewal',
        dueDate: policy.renewalDate,
        status: 'pending',
        isAutomatic: true,
        renewalEventKey,
        notes: `Auto-generated renewal reminder for policy ${policy.policyNumber}`
      });

      await followUp.save();

      const notification = new Notification({
        agencyId: policy.agencyId,
        userId: policy.assignedAgentId,
        type: 'renewal_reminder',
        title: 'Policy Renewal Reminder',
        message: `Policy ${policy.policyNumber} for customer ${customerName} is due for renewal on ${renewalDateStr}`
      });
      await notification.save();

      const activity = new Activity({
        agencyId: policy.agencyId,
        actorId: null,
        customerId: policy.customerId,
        resourceType: 'FollowUp',
        resourceId: followUp._id,
        actionType: 'FOLLOW_UP_CREATED',
        description: `Auto-generated renewal reminder for policy ${policy.policyNumber}`
      });
      await activity.save();

      created++;
    } catch (error) {
      console.error(`[RenewalReminderJob] Failed processing policy ${policy._id}:`, error);
    }
  }

  return { processed, created, skipped };
};

module.exports = {
  processRenewalReminders
};
