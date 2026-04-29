//C:\Users\User\Desktop\New Cloned\academy\acemedixacademy\lib\vapi\accounts.ts

export interface VapiAccount {
  id: string;
  publicKey: string;
  assistants: {
    patientFemale: string;
    patientMale: string;
    tutor: string;
  };
  maxConcurrency: number;
}

export const VAPI_ACCOUNTS: VapiAccount[] = [
  {
    id: 'acc-1',
    publicKey: process.env.VAPI_PUBLIC_KEY_1!,
    assistants: {
      patientFemale: process.env.VAPI_ACC1_PATIENT_FEMALE!,
      patientMale: process.env.VAPI_ACC1_PATIENT_MALE!,
      tutor: process.env.VAPI_ACC1_TUTOR!,
    },
    maxConcurrency: 10,
  },
  {
    id: 'acc-2',
    publicKey: process.env.VAPI_PUBLIC_KEY_2!,
    assistants: {
      patientFemale: process.env.VAPI_ACC2_PATIENT_FEMALE!,
      patientMale: process.env.VAPI_ACC2_PATIENT_MALE!,
      tutor: process.env.VAPI_ACC2_TUTOR!,
    },
    maxConcurrency: 10,
  },
  {
    id: 'acc-3',
    publicKey: process.env.VAPI_PUBLIC_KEY_3!,
    assistants: {
      patientFemale: process.env.VAPI_ACC3_PATIENT_FEMALE!,
      patientMale: process.env.VAPI_ACC3_PATIENT_MALE!,
      tutor: process.env.VAPI_ACC3_TUTOR!,
    },
    maxConcurrency: 10,
  },
  {
    id: 'acc-4',
    publicKey: process.env.VAPI_PUBLIC_KEY_4!,
    assistants: {
      patientFemale: process.env.VAPI_ACC4_PATIENT_FEMALE!,
      patientMale: process.env.VAPI_ACC4_PATIENT_MALE!,
      tutor: process.env.VAPI_ACC4_TUTOR!,
    },
    maxConcurrency: 10,
  },
  {
    id: 'acc-5',
    publicKey: process.env.VAPI_PUBLIC_KEY_5!,
    assistants: {
      patientFemale: process.env.VAPI_ACC5_PATIENT_FEMALE!,
      patientMale: process.env.VAPI_ACC5_PATIENT_MALE!,
      tutor: process.env.VAPI_ACC5_TUTOR!,
    },
    maxConcurrency: 10,
  },
];

// Add this at the bottom of accounts.ts
export const TOTAL_ACCOUNTS = VAPI_ACCOUNTS.filter(acc => 
  acc.publicKey && acc.publicKey.trim() !== ''
).length;