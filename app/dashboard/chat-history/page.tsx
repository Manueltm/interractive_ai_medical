// app/dashboard/chat-history/page.tsx
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard?section=chat-history');
}