// utils/voicePreset.ts
import type { Patient } from '@/lib/db/schema';

// export function pickHumeVoice(patient: Patient | null): string {
//   if (!patient) return 'ee96fb5f-ec1a-4f41-a9ba-6d119e64c8fd'; // <- neutral default

//   const age = parseInt(patient.age, 10);
//   const gender = patient.gender?.toLowerCase();

//   // Hume EVI voice IDs (2025-06 catalog)
//   const presets = {
//     young_female: '9e068547-5ba4-4c8e-8e03-69282a008f04', // Sitcom Girl
//     young_male:   'ee96fb5f-ec1a-4f41-a9ba-6d119e64c8fd', // Colton Rivers
//     adult_female: 'a5c32f70-2ff4-4f18-a307-0cff4e9ee88d', // Alice Bennett
//     adult_male:   'ee96fb5f-ec1a-4f41-a9ba-6d119e64c8fd', // Terrence Bentley
//     senior_female:'3e48b5e9-7840-46f5-9c40-70734c5a9c9a', // Inspiring Woman
//     senior_male:  'ee96fb5f-ec1a-4f41-a9ba-6d119e64c8fd', // Inspiring Man
//   } as const;

//   let stage: 'young' | 'adult' | 'senior' = 'adult';
//   if (age < 25) stage = 'young';
//   else if (age > 55) stage = 'senior';

//   const normalizedGender = gender === 'female' || gender === 'f' ? 'female' : 'male';
//   const key = `${stage}_${normalizedGender}` as keyof typeof presets;
//   return presets[key] ?? presets.adult_male;
// }
// utils/voicePreset.ts
export const pickHumeVoice = (patient: any): string => {
  // Simple voice selection based on gender
  if (patient.gender === 'female') {
    return '3dc0c4c9-71f4-4f6e-8b3e-8b7b6c9d7a5c'; // Female voice
  }
  return '1bd17f1a-1c2d-4d71-8d6b-9d6d7c2d5d7c'; // Male voice (default)
};