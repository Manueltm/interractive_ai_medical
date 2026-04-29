// lib/vapi/client.ts
import Vapi from '@vapi-ai/web';

export async function getVapiConfig(
  type: 'patientFemale' | 'patientMale' | 'tutor',
  excludeAccounts: string[] = []
) {
  const params = new URLSearchParams({ type });
  if (excludeAccounts.length) params.set('exclude', excludeAccounts.join(','));

  const res = await fetch(`/api/vapi/config?${params}`);
  if (!res.ok) {
    // Create an error object that extractVapiError can parse properly
    const errorData = await res.json().catch(() => ({}));
    const err = new Error(errorData.error || 'No VAPI accounts available') as any;
    err.statusCode = res.status;
    err.error = { statusCode: res.status, message: errorData.error || 'No VAPI accounts available' };
    throw err;
  }
  return res.json() as Promise<{
    publicKey: string;
    accountId: string;
    assistantId: string;
  }>;
}

export async function initVapi(
  type: 'patientFemale' | 'patientMale' | 'tutor',
  excludeAccounts: string[] = []
): Promise<{ vapi: Vapi; accountId: string; assistantId: string }> {
  const config = await getVapiConfig(type, excludeAccounts);
  const vapi = new Vapi(config.publicKey);
  return { vapi, accountId: config.accountId, assistantId: config.assistantId };
}

export async function trackCall(
  accountId: string,
  action: 'start' | 'end' | 'exhausted'
) {
  await fetch('/api/vapi/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId, action }),
  });
}