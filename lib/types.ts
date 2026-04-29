// lib/types.ts
import type { ChatHistoryItem, PatientCase, Patient, SessionType, Chat } from '@/lib/db/schema';

export type StringOrDate = string | Date;

export type AsDate<T> = {
  [K in keyof T]: T[K] extends string
    ? K extends 'createdAt' | 'updatedAt' | 'completedAt'
      ? Date
      : T[K]
    : T[K] extends string | null
    ? K extends 'createdAt' | 'updatedAt' | 'completedAt'
      ? Date | null
      : T[K]
    : T[K];
};

// Fixed type definitions that match your split component expectations
export type ChatHistoryItemFixed = AsDate<ChatHistoryItem>;
export type PatientCaseFixed = AsDate<PatientCase>;
export type PatientFixed = AsDate<Patient> & { gender?: 'male' | 'female' | 'other' | null };

// Types that match what your split components expect
export type SessionTypeForComponents = Omit<AsDate<SessionType>, 'stations'> & {
  stations: { index: number; patientId: string }[] | null;
};

export type ChatForComponents = Omit<AsDate<Chat>, 'examSteps'> & {
  examSteps: { name: string; videoUrl: string }[] | null;
};

export type ChatWithPatientNameForComponents = ChatForComponents & {
  patientName?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
  parts: any[]; // Required by AI SDK
  // Add any other properties your messages have
};

export type CustomUIDataTypes = {
  // Add your custom data types here
  // This might be empty if you don't have custom types
  [key: string]: any;
};