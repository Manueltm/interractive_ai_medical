// utils/createEviConfig.ts
export async function createEviConfig(voiceId: string) {
  const apiKey = process.env.HUME_API_KEY;
  if (!apiKey) throw new Error('Missing HUME_API_KEY');

  const payload = {
    evi_version: '3',
    name: `patient-${voiceId.slice(-8)}`, // may clash
    voice: { id: voiceId, provider: 'HUME_AI' },
  };

  const res = await fetch('https://api.hume.ai/v0/evi/configs', {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // 200 = new, 409 = already exists – both give { id: string }
  if (res.status === 200 || res.status === 409) {
    const json = await res.json();
    return json.id as string;
  }

  // real error
  const text = await res.text();
  throw new Error(`EVI config error ${res.status}: ${text}`);
}