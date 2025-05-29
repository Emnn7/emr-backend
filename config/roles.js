const ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  LAB_ASSISTANT: 'labAssistant',
  RECEPTIONIST: 'receptionist',
  PATIENT: 'patient'
};

// Detailed permission definitions
const PERMISSION_DETAILS = {
  // Patient permissions
  PATIENT_VIEW_OWN: {
    description: 'View own patient record',
    category: 'patient'
  },
  PATIENT_UPDATE_OWN: {
    description: 'Update own patient information',
    category: 'patient'
  },

  // Appointment permissions
  APPOINTMENT_CREATE: {
    description: 'Create appointments',
    category: 'appointments'
  },
  APPOINTMENT_VIEW: {
    description: 'View appointments',
    category: 'appointments'
  },
  APPOINTMENT_UPDATE: {
    description: 'Update appointments',
    category: 'appointments'
  },
  APPOINTMENT_DELETE: {
    description: 'Cancel appointments',
    category: 'appointments'
  },

  // Medical records
  MEDICAL_RECORD_VIEW: {
    description: 'View medical records',
    category: 'medical'
  },
  MEDICAL_RECORD_CREATE: {
    description: 'Create medical records',
    category: 'medical'
  },
  MEDICAL_RECORD_UPDATE: {
    description: 'Update medical records',
    category: 'medical'
  },

  // Lab permissions
  LAB_ORDER_CREATE: {
    description: 'Create lab orders',
    category: 'lab'
  },
  LAB_ORDER_VIEW: {
    description: 'View lab orders',
    category: 'lab'
  },
  LAB_RESULT_VIEW: {
    description: 'View lab results',
    category: 'lab'
  },
  LAB_RESULT_UPDATE: {
    description: 'Update lab results',
    category: 'lab'
  },
   MEDICAL_RECORD_CREATE: {
    description: 'Create medical records',
    category: 'lab'
  },
    MEDICAL_RECORD_VIEW: {
    description: 'View medical records',
    category: 'lab'
  },
  VITAL_SIGNS_RECORD: {
  description: 'Record vital signs',
  category: 'medical'
},

  // Billing permissions
  BILLING_CREATE: {
    description: 'Create bills',
    category: 'billing'
  },
  BILLING_VIEW: {
    description: 'View bills',
    category: 'billing'
  },
  BILLING_UPDATE: {
    description: 'Update bills',
    category: 'billing'
  },
  PAYMENT_PROCESS: {
    description: 'Process payments',
    category: 'billing'
  },

  // User management
  USER_MANAGE: {
    description: 'Manage users',
    category: 'admin'
  },
  ROLE_MANAGE: {
    description: 'Manage roles',
    category: 'admin'
  },
  PERMISSION_MANAGE: {
    description: 'Manage permissions',
    category: 'admin'
  },

  // System
  SYSTEM_SETTINGS_UPDATE: {
    description: 'Update system settings',
    category: 'admin'
  },
  AUDIT_LOG_VIEW: {
    description: 'View audit logs',
    category: 'admin'
  }
};

// Role-based permission assignments
const PERMISSIONS = {
  [ROLES.ADMIN]: Object.keys(PERMISSION_DETAILS), // Admins have all permissions
  [ROLES.DOCTOR]: [
    'APPOINTMENT_VIEW',
    'APPOINTMENT_UPDATE',
    'MEDICAL_RECORD_VIEW',
    'MEDICAL_RECORD_CREATE',
    'MEDICAL_RECORD_UPDATE',
    'LAB_ORDER_CREATE',
    'LAB_ORDER_VIEW',
    'LAB_RESULT_VIEW',
    'BILLING_VIEW',
      'VITAL_SIGNS_RECORD' 
  ],
  [ROLES.LAB_ASSISTANT]: [
    'LAB_ORDER_VIEW',
    'LAB_RESULT_VIEW',
    'LAB_RESULT_UPDATE',
    'MEDICAL_RECORD_CREATE',
  'MEDICAL_RECORD_VIEW',
  'VITAL_SIGNS_RECORD' 
  ],
  [ROLES.RECEPTIONIST]: [
    'APPOINTMENT_CREATE',
    'APPOINTMENT_VIEW',
    'APPOINTMENT_UPDATE',
    'APPOINTMENT_DELETE',
    'BILLING_CREATE',
    'BILLING_VIEW',
    'BILLING_UPDATE',
    'PAYMENT_PROCESS'
  ],
  [ROLES.PATIENT]: [
    'PATIENT_VIEW_OWN',
    'PATIENT_UPDATE_OWN',
    'APPOINTMENT_CREATE',
    'APPOINTMENT_VIEW',
    'MEDICAL_RECORD_VIEW',
    'BILLING_VIEW',
    'PAYMENT_PROCESS'
  ]
};

// Permission check function
const checkPermission = (role, permission) => {
  // Admins have all permissions
  if (role === ROLES.ADMIN) return true;
  
  return PERMISSIONS[role]?.includes(permission) || false;
};

module.exports = {
  ROLES,
  PERMISSIONS,
  PERMISSION_DETAILS,
  checkPermission
};