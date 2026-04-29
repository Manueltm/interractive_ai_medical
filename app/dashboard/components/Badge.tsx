// app/dashboard/components/Badge.tsx
import { FC } from 'react';
import { cn } from "@/utils";

export const Badge: FC<{ text: string; value?: string }> = ({ text }) => (
  <span className={cn(
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    "bg-blue-100 text-blue-800",
    "dark:bg-blue-900 dark:text-blue-200"
  )}>
    {text}
  </span>
);

export const AllBadge: FC<{ text: string }> = ({ text }) => (
  <span className={cn(
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
    "bg-green-100 text-green-800 border-green-200",
    "dark:bg-green-900 dark:text-green-200 dark:border-green-800"
  )}>
    {text}
  </span>
);