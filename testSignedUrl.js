// testSignedUrl.js
import { config } from 'dotenv';
import fetch from 'node-fetch';

// explicitly load .env.local
config({ path: '.env.local' });

async function testSignedUrl() {
  try {
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      console.log("API_KEY or AGENT_ID not loaded!");
      return;
    }

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!resp.ok) {
      console.log("Failed to get signed URL:", resp.status, await resp.text());
      return;
    }

    const data = await resp.json();
    console.log("Signed URL received:", data.signed_url);
  } catch (err) {
    console.error("Error:", err);
  }
}

testSignedUrl();