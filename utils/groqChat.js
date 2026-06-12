/**
 * Groq AI Chat Utility
 * Inajibu kama binadamu - Swahili + English
 */

const https = require('https');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile';

// Chat history kwa kila mtumiaji (memory ya mazungumzo)
const chatHistory = new Map();
const MAX_HISTORY = 10; // messages 10 za mwisho

function getSystemPrompt() {
  const now = new Date().toLocaleString('sw-TZ', { timeZone: 'Africa/Dar_es_Salaam' });
  return `Wewe ni ${process.env.BOT_NAME || 'MR. MEDIATOR'} — msaidizi wa WhatsApp mwenye akili, urafiki, na ubunifu.

TABIA YAKO:
- Unajibu kama binadamu wa kawaida — si roboti
- Una hisia, unachekesha, unajali
- Unazungumza Kiswahili SAFI kama mtumiaji akizungumza Kiswahili
- Unazungumza English vizuri kama mtumiaji akizungumza English
- Unagundua lugha automatically na kujibu kwa lugha HIYO HIYO
- Majibu mafupi na ya moja kwa moja (si essay) isipokuwa swali linahitaji maelezo
- Unatumia emoji kidogo lakini kwa ujanja
- KAMWE usiseme "mimi ni AI" au "mimi ni chatbot" — jibu tu kwa uasili

MAZINGIRA:
- Uko WhatsApp
- Wakati wa sasa (EAT): ${now}
- Una memory ya mazungumzo yaliyopita kwenye chat hii

MFANO WA JIBU ZURI:
User: "habari?"
Wewe: "Nzuri sana! Wewe je? 😊"

User: "what's 2+2?"
Wewe: "4 😄 Easy one!"

User: "nisikie huzuni"
Wewe: "Pole sana 🤗 Niko hapa, niambie kilichotokea?"`;
}

async function groqReply(userId, userMessage) {
  return new Promise((resolve, reject) => {
    if (!GROQ_API_KEY) {
      return resolve('⚠️ GROQ_API_KEY haijawekwa kwenye Railway environment variables.');
    }

    // Pata au unda history ya mtumiaji
    if (!chatHistory.has(userId)) {
      chatHistory.set(userId, []);
    }
    const history = chatHistory.get(userId);

    // Ongeza message ya mtumiaji
    history.push({ role: 'user', content: userMessage });

    // Limit history
    while (history.length > MAX_HISTORY) history.shift();

    const body = JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      temperature: 0.85,
      messages: [
        { role: 'system', content: getSystemPrompt() },
        ...history
      ]
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const reply = parsed.choices?.[0]?.message?.content?.trim();
          if (!reply) return resolve('...');

          // Hifadhi jibu la AI kwenye history
          history.push({ role: 'assistant', content: reply });
          while (history.length > MAX_HISTORY) history.shift();

          resolve(reply);
        } catch (e) {
          resolve('Samahani, kuna tatizo kidogo. Jaribu tena! 😅');
        }
      });
    });

    req.on('error', () => resolve('Samahani, sina connection sasa. Jaribu baadaye! 🙏'));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve('Imechukua muda mrefu. Jaribu tena! ⏳');
    });

    req.write(body);
    req.end();
  });
}

// Futa history ya mtumiaji
function clearHistory(userId) {
  chatHistory.delete(userId);
}

module.exports = { groqReply, clearHistory };
