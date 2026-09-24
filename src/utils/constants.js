const ROLES = Object.freeze({ ADMIN: 'admin', AGENT: 'agent' });

const USER_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending' });

const AGENCY_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });

const POLICY_TYPES = Object.freeze({
  LIFE: 'life', HEALTH: 'health', MOTOR: 'motor',
  PROPERTY: 'property', TRAVEL: 'travel', OTHER: 'other'
});

const POLICY_STATUSES = Object.freeze({
  ACTIVE: 'active', EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired', RENEWED: 'renewed'
});

const PREMIUM_FREQUENCIES = Object.freeze({
  MONTHLY: 'monthly', QUARTERLY: 'quarterly',
  HALF_YEARLY: 'half_yearly', YEARLY: 'yearly', SINGLE: 'single'
});

const TRANSACTION_TYPES = Object.freeze({
  PURCHASE: 'purchase', REDEMPTION: 'redemption',
  SIP_PURCHASE: 'sip_purchase', SWITCH_IN: 'switch_in',
  SWITCH_OUT: 'switch_out', DIVIDEND: 'dividend',
  DIVIDEND_REINVESTMENT: 'dividend_reinvestment',
  STP: 'stp', SWP: 'swp'
});

const SIP_STATUSES = Object.freeze({
  ACTIVE: 'active', PAUSED: 'paused',
  COMPLETED: 'completed', CANCELLED: 'cancelled'
});

const SIP_FREQUENCIES = Object.freeze({
  MONTHLY: 'monthly', QUARTERLY: 'quarterly'
});

const FOLLOW_UP_TYPES = Object.freeze({
  RENEWAL: 'renewal', GENERAL: 'general',
  DOCUMENT: 'document', PAYMENT: 'payment', OTHER: 'other'
});

const FOLLOW_UP_STATUSES = Object.freeze({
  PENDING: 'pending', CONTACTED: 'contacted',
  INTERESTED: 'interested', NOT_INTERESTED: 'not_interested',
  COMPLETED: 'completed', RESCHEDULED: 'rescheduled'
});

const DOCUMENT_CATEGORIES = Object.freeze({
  PAN: 'pan', AADHAAR: 'aadhaar', POLICY_DOCUMENT: 'policy_document',
  NOMINEE_DOCUMENT: 'nominee_document', KYC: 'kyc',
  BANK_PROOF: 'bank_proof', ACCOUNT_STATEMENT: 'account_statement',
  PHOTO: 'photo', OTHER: 'other', CUSTOM: 'custom'
});

const OCR_STATUSES = Object.freeze({
  PENDING: 'pending', PROCESSING: 'processing',
  COMPLETED: 'completed', FAILED: 'failed',
  NOT_APPLICABLE: 'not_applicable'
});

const IMPORT_TYPES = Object.freeze({
  CUSTOMER: 'customer', INSURANCE: 'insurance',
  MUTUAL_FUND: 'mutual_fund', SIP: 'sip',
  TRANSACTION: 'transaction', NAV: 'nav'
});

const IMPORT_STATUSES = Object.freeze({
  UPLOADED: 'uploaded', PARSING: 'parsing',
  VALIDATING: 'validating', PREVIEW: 'preview',
  IMPORTING: 'importing', COMPLETED: 'completed',
  FAILED: 'failed'
});

const DUPLICATE_ACTIONS = Object.freeze({
  SKIP: 'skip', UPDATE: 'update',
  CREATE_SEPARATE: 'create_separate', MERGE: 'merge'
});

const ACTIVITY_TYPES = Object.freeze({
  CUSTOMER_CREATED: 'customer_created', CUSTOMER_UPDATED: 'customer_updated',
  CUSTOMER_REASSIGNED: 'customer_reassigned', CUSTOMER_DELETED: 'customer_deleted',
  POLICY_CREATED: 'policy_created', POLICY_UPDATED: 'policy_updated',
  POLICY_RENEWED: 'policy_renewed', POLICY_DELETED: 'policy_deleted',
  INVESTMENT_CREATED: 'investment_created', INVESTMENT_UPDATED: 'investment_updated',
  SIP_CREATED: 'sip_created', SIP_UPDATED: 'sip_updated',
  TRANSACTION_CREATED: 'transaction_created',
  DOCUMENT_UPLOADED: 'document_uploaded', DOCUMENT_DELETED: 'document_deleted',
  OCR_COMPLETED: 'ocr_completed', OCR_CONFIRMED: 'ocr_confirmed',
  FOLLOW_UP_CREATED: 'follow_up_created', FOLLOW_UP_COMPLETED: 'follow_up_completed',
  WHATSAPP_PREPARED: 'whatsapp_prepared',
  IMPORT_COMPLETED: 'import_completed',
  AGENT_ADDED: 'agent_added', AGENT_REMOVED: 'agent_removed'
});

const NOTIFICATION_TYPES = Object.freeze({
  RENEWAL_REMINDER: 'renewal_reminder',
  FOLLOW_UP: 'follow_up', SYSTEM: 'system'
});

const DOC_REQUIREMENT_MODULES = Object.freeze({
  INSURANCE: 'insurance', MUTUAL_FUND: 'mutual_fund', GENERAL: 'general'
});

const ALLOWED_FILE_TYPES = Object.freeze({
  DOCUMENT: ['application/pdf', 'image/jpeg', 'image/png'],
  IMPORT: ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const RENEWAL_REMINDER_DAYS = 30;

const MF_STATUSES = Object.freeze({ ACTIVE: 'active', CLOSED: 'closed' });

module.exports = {
  ROLES,
  USER_STATUS,
  AGENCY_STATUS,
  POLICY_TYPES,
  POLICY_STATUSES,
  PREMIUM_FREQUENCIES,
  TRANSACTION_TYPES,
  SIP_STATUSES,
  SIP_FREQUENCIES,
  FOLLOW_UP_TYPES,
  FOLLOW_UP_STATUSES,
  DOCUMENT_CATEGORIES,
  OCR_STATUSES,
  IMPORT_TYPES,
  IMPORT_STATUSES,
  DUPLICATE_ACTIONS,
  ACTIVITY_TYPES,
  NOTIFICATION_TYPES,
  DOC_REQUIREMENT_MODULES,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  RENEWAL_REMINDER_DAYS,
  MF_STATUSES
};
