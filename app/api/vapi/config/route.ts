// app/api/vapi/config/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { VAPI_ACCOUNTS } from '@/lib/vapi/accounts';

// In-memory tracker - works for single instance
const activeCalls = new Map<string, number>();
const exhaustedAccounts = new Map<string, { timestamp: number; reason: string }>();
const EXHAUSTION_TIMEOUT = 60 * 1000; // 1 minute

function cleanupExhaustedAccounts() {
  const now = Date.now();
  for (const [accountId, data] of exhaustedAccounts.entries()) {
    if (now - data.timestamp > EXHAUSTION_TIMEOUT) {
      exhaustedAccounts.delete(accountId);
      console.log(`🔄 Reset exhausted flag for account ${accountId}`);
    }
  }
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') as 'patientFemale' | 'patientMale' | 'tutor';
  const exclude = req.nextUrl.searchParams.get('exclude')?.split(',').filter(Boolean) || [];

  if (!type || !['patientFemale', 'patientMale', 'tutor'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  }

  cleanupExhaustedAccounts();

  console.log(`📞 GET /api/vapi/config - Type: ${type}, Exclude: ${exclude}`);
  console.log(`   Active calls:`, Object.fromEntries(activeCalls));
  console.log(`   Exhausted:`, Array.from(exhaustedAccounts.keys()));

  // Sort by least active calls for load balancing
  const sortedAccounts = [...VAPI_ACCOUNTS].sort((a, b) => {
    const aCalls = activeCalls.get(a.id) || 0;
    const bCalls = activeCalls.get(b.id) || 0;
    return aCalls - bCalls;
  });

  // Find first available account
  const available = sortedAccounts.find(acc => {
    if (exclude.includes(acc.id)) {
      console.log(`⏭️ Skipping excluded account ${acc.id}`);
      return false;
    }
    if (exhaustedAccounts.has(acc.id)) {
      console.log(`⏭️ Skipping exhausted account ${acc.id}`);
      return false;
    }
    if (!acc.assistants[type] || acc.assistants[type].trim() === '') {
      console.log(`⏭️ Account ${acc.id} missing assistant for type ${type}`);
      return false;
    }
    if (!acc.publicKey || acc.publicKey.trim() === '') {
      console.log(`⏭️ Account ${acc.id} missing public key`);
      return false;
    }
    const currentCalls = activeCalls.get(acc.id) || 0;
    const isUnderLimit = currentCalls < acc.maxConcurrency;
    if (!isUnderLimit) {
      console.log(`⏭️ Account ${acc.id} at capacity: ${currentCalls}/${acc.maxConcurrency}`);
    }
    return isUnderLimit;
  });

  if (!available) {
    console.error(`❌ No accounts available for type ${type}`);
    return NextResponse.json(
      { error: 'No accounts available', activeCalls: Object.fromEntries(activeCalls) },
      { status: 503 }
    );
  }

  console.log(`✅ Selected account ${available.id} for type ${type}`);
  
  return NextResponse.json({
    publicKey: available.publicKey,
    accountId: available.id,
    assistantId: available.assistants[type],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, action } = await req.json();

    if (!accountId || !action) {
      return NextResponse.json({ error: 'Missing accountId or action' }, { status: 400 });
    }

    console.log(`📊 POST /api/vapi/config - Account: ${accountId}, Action: ${action}`);

    if (action === 'start') {
      const current = activeCalls.get(accountId) || 0;
      activeCalls.set(accountId, current + 1);
      console.log(`   ✅ Started call for ${accountId}. Active: ${current + 1}`);
    } 
    else if (action === 'end') {
      const current = activeCalls.get(accountId) || 0;
      const newCount = Math.max(0, current - 1);
      activeCalls.set(accountId, newCount);
      console.log(`   ✅ Ended call for ${accountId}. Active: ${newCount}`);
    } 
    else if (action === 'exhausted') {
      exhaustedAccounts.set(accountId, { timestamp: Date.now(), reason: 'API key error' });
      const current = activeCalls.get(accountId) || 0;
      if (current > 0) {
        activeCalls.set(accountId, current - 1);
      }
      console.log(`   ⚠️ Marked account ${accountId} as exhausted for ${EXHAUSTION_TIMEOUT / 1000}s`);
    }
    else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in POST /api/vapi/config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}