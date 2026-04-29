require('dotenv').config({ path: '.env.local' }); // Specify .env.local explicitly
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }]
}).then(res => console.log(res.choices[0].message.content)).catch(console.error);