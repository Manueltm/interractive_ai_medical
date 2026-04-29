import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface TrackActivityParams {
  applicationSlug: string;
  activityType: 'session_start' | 'session_complete' | 'question_attempt' | 'score_update';
  metadata?: Record<string, any>;
  sessionId?: string;
}

export function useActivityTracker() {
  const { data: session } = useSession();

  const trackActivity = useCallback(async (params: TrackActivityParams) => {
    if (!session?.user?.id) return;

    try {
      await fetch('/api/user/activity/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }, [session]);

  return { trackActivity };
}