// app/dashboard/components/TokenBalance.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface TokenBalanceProps {
  compact?: boolean;
}

export default function TokenBalance({ compact = false }: TokenBalanceProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/tokens/balance');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchBalance();
    }
  }, [session]);

  // Listen for balance update events
  useEffect(() => {
  const handleBalanceUpdate = () => {
    console.log('🔄 Refreshing balance...');
    fetchBalance();
  };

  // Listen for both events
  window.addEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
  window.addEventListener('refreshTokenBalance', handleBalanceUpdate);
  
  return () => {
    window.removeEventListener('balanceUpdated', handleBalanceUpdate as EventListener);
    window.removeEventListener('refreshTokenBalance', handleBalanceUpdate);
  };
}, [fetchBalance]);

  const handleTokenClick = () => {
    router.push('/dashboard/tokens');
  };

  const lowBalance = balance < 10;
  const criticalBalance = balance < 5;

  if (loading) {
    return (
      <button 
        onClick={handleTokenClick}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
      >
        <div className="animate-pulse bg-gray-300 rounded-full w-4 h-4"></div>
        {!compact && <div className="animate-pulse bg-gray-300 rounded w-16 h-4"></div>}
      </button>
    );
  }

  return (
    <button 
      onClick={handleTokenClick}
      className={`
        flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer
        ${criticalBalance 
          ? 'bg-red-100 hover:bg-red-200 text-red-800 border border-red-200 shadow-sm' 
          : lowBalance 
          ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-200 shadow-sm'
          : 'bg-green-100 hover:bg-green-200 text-green-800 border border-green-200 shadow-sm'
        }
        hover:scale-105 active:scale-95
      `}
      title={criticalBalance ? "Low tokens! Click to buy more" : "Click to manage tokens"}
    >
      <div
        className={`w-3 h-3 rounded-full ${
          criticalBalance ? 'bg-red-500' :
          lowBalance ? 'bg-yellow-500' :
          'bg-green-500'
        }`}
      ></div>
      {!compact && (
        <span className={`text-sm font-medium ${
          criticalBalance ? 'text-red-700' :
          lowBalance ? 'text-yellow-700' :
          'text-green-700'
        }`}>
          {balance.toLocaleString()} tokens
        </span>
      )}
    </button>
  );
}