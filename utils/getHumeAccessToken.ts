//C:\Users\User\Desktop\Cloned\hume-voice-simulator\utils\getHumeAccessToken.ts
import 'server-only';

import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async () => {
  const apiKey = process.env.HUME_API_KEY;
  const secretKey = process.env.HUME_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Missing required environment variables (HUME_API_KEY or HUME_SECRET_KEY)');
  }

  const accessToken = await fetchAccessToken({
    apiKey: String(process.env.HUME_API_KEY),
    secretKey: String(process.env.HUME_SECRET_KEY),
  });

  if (accessToken === "undefined") {
    throw new Error('Unable to get access token');
  }

  return accessToken ?? null;
};

// utils/getHumeAccessToken.ts
// utils/getHumeAccessToken.ts
// import 'server-only';

// export const getHumeAccessToken = async (
//   configId?: string   // << new
// ) => {
//   const apiKey = process.env.HUME_API_KEY;
//   const secretKey = process.env.HUME_SECRET_KEY;
//   if (!apiKey || !secretKey) throw new Error('Missing env vars');

//   const qp = new URLSearchParams({
//     grant_type: 'client_credentials',
//     client_id: apiKey,
//     client_secret: secretKey,
//     ...(configId && { config_id: configId }),
//   });

//   const res = await fetch(`https://api.hume.ai/v0/oauth2-cc?${qp}`, {
//     method: 'POST', // body is empty; everything is in the query
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`Hume auth error ${res.status}: ${text}`);
//   }
//   const json = await res.json();
//   return json.access_token as string;
// };