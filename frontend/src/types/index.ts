export interface User {
    id: number;
    username: string;
    email: string;
    fullName: string;
    enabled: boolean;
    roles: string[];
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    username: string;
    email: string;
    roles: string[];
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    fullName: string;
}

export interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
}

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type StepType = 'START' | 'TASK' | 'APPROVAL' | 'NOTIFICATION' | 'CONDITION' | 'END';
export type FieldType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'EMAIL' | 'DATE' | 'SELECT' | 'RADIO' | 'CHECKBOX' | 'FILE';
export type InstanceStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface FormField {
    id?: number;
    label: string;
    fieldKey: string;
    fieldType: FieldType;
    required: boolean;
    placeholder?: string;
    options?: string;
    validationRegex?: string;
    fieldOrder: number;
}

export interface WorkflowStep {
    id?: number;
    name: string;
    description?: string;
    type: StepType;
    stepOrder: number;
    assignedRoleId?: number;
    assignedRoleName?: string;
    positionX?: number;
    positionY?: number;
    transitionTargets?: string;
    formFields: FormField[];
}

export interface BusinessRule {
    id?: number;
    name: string;
    description?: string;
    conditionExpression?: string;
    actionType?: string;
    targetStepId?: number;
    ruleOrder: number;
}

export interface Workflow {
    id?: number;
    name: string;
    description?: string;
    status: WorkflowStatus;
    createdByUsername?: string;
    steps: WorkflowStep[];
    businessRules?: BusinessRule[];
    createdAt?: string;
}

export interface WorkflowInstance {
    id: number;
    workflowId: number;
    workflowName: string;
    currentStepId?: number;
    currentStepName?: string;
    assigneeUsername?: string;
    initiatedByUsername?: string;
    status: InstanceStatus;
    formData?: string;
    createdAt?: string;
    completedAt?: string;
}

export interface Page<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}
