//app/dashboard/components/TokenWarning.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function TokenWarning() {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (session?.user?.id) {
        const res = await fetch('/api/tokens/balance');
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
          setShowWarning(data.balance < 5);
        }
      }
    };

    fetchBalance();
    // Check balance every minute
    const interval = setInterval(fetchBalance, 60000);
    return () => clearInterval(interval);
  }, [session]);

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Low Token Balance
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                You have only {balance} tokens remaining. Some features may be limited.
              </p>
            </div>
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <Link
                  href="/dashboard/tokens"
                  className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                >
                  Buy Tokens
                </Link>
                <button
                  onClick={() => setShowWarning(false)}
                  className="ml-3 bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}