import type { BusinessRule } from '../types';
import type { FormField } from '../types';

/** System sample restrictions: add as business rules to enforce limits. */
export const sampleRestrictions: Array<Omit<BusinessRule, 'id'> & { ruleOrder: number }> = [
  {
    name: 'Max amount 10,000',
    description: 'Reject requests over 10,000',
    conditionExpression: 'amount > 10000',
    actionType: 'REJECT',
    ruleOrder: 0,
  },
  {
    name: 'Require approval above 5,000',
    description: 'Any amount over 5,000 must go to approval step',
    conditionExpression: 'amount > 5000',
    actionType: 'REQUIRE_APPROVAL',
    ruleOrder: 0,
  },
  {
    name: 'Expiry within 30 days',
    description: 'Notify admin when request is within 30 days of expiry',
    conditionExpression: 'days_until_expiry < 30',
    actionType: 'NOTIFY_ADMIN',
    ruleOrder: 0,
  },
  {
    name: 'No approval below 100',
    description: 'Auto-approve small amounts',
    conditionExpression: 'amount < 100',
    actionType: 'AUTO_APPROVE',
    ruleOrder: 0,
  },
];

/** System sample rules: conditions and actions. */
export const sampleRules: Array<Omit<BusinessRule, 'id'> & { ruleOrder: number }> = [
  {
    name: 'High value approval',
    description: 'Amount over 1,000 requires approval',
    conditionExpression: 'amount > 1000',
    actionType: 'REQUIRE_APPROVAL',
    ruleOrder: 0,
  },
  {
    name: 'Pending notify',
    description: 'Notify admin when status is pending',
    conditionExpression: "status == 'PENDING'",
    actionType: 'NOTIFY_ADMIN',
    ruleOrder: 0,
  },
  {
    name: 'Escalate after 7 days',
    description: 'Escalate if not completed in 7 days',
    conditionExpression: 'days_pending > 7',
    actionType: 'ESCALATE',
    ruleOrder: 0,
  },
  {
    name: 'Reject invalid status',
    description: 'Reject when status is invalid',
    conditionExpression: "status == 'INVALID'",
    actionType: 'REJECT',
    ruleOrder: 0,
  },
];

/** System sample attributes (form fields) to add to steps. */
export const sampleAttributes: Array<Omit<FormField, 'id'>> = [
  {
    label: 'Amount',
    fieldKey: 'amount',
    fieldType: 'NUMBER',
    required: true,
    placeholder: 'Enter amount',
    fieldOrder: 0,
  },
  {
    label: 'Comment',
    fieldKey: 'comment',
    fieldType: 'TEXTAREA',
    required: false,
    placeholder: 'Add a comment...',
    fieldOrder: 0,
  },
  {
    label: 'Approval decision',
    fieldKey: 'approval_decision',
    fieldType: 'SELECT',
    required: true,
    options: '["Approved","Rejected","Pending"]',
    placeholder: 'Select',
    fieldOrder: 0,
  },
  {
    label: 'Requestor email',
    fieldKey: 'requestor_email',
    fieldType: 'EMAIL',
    required: true,
    placeholder: 'email@example.com',
    fieldOrder: 0,
  },
  {
    label: 'Request date',
    fieldKey: 'request_date',
    fieldType: 'DATE',
    required: true,
    fieldOrder: 0,
  },
  {
    label: 'Department',
    fieldKey: 'department',
    fieldType: 'TEXT',
    required: false,
    placeholder: 'e.g. Finance, HR',
    fieldOrder: 0,
  },
];
