// lib/types/department.ts
export type DepartmentType = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  fontColor: string | null;
  isFlashcardDept: boolean;
  osceType: 'clerking' | 'counselling' | 'physical_exam' | null;
  createdAt: Date;
  updatedAt: Date;
};