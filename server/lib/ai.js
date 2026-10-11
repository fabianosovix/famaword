import { getDb } from '../db.js';
import { config } from '../config.js';

// Read AI config from DB, with env-var fallback for backward compatibility
function getAIConfig() {
  try {
    const row = getDb()
      .prepare(`SELECT ai_text_provider, ai_text_api_key, ai_text_model, ai_image_provider, ai_image_api_key, ai_image_model FROM settings WHERE id = 1`)
      .get();
    const textProvider = row?.ai_text_provider || 'openai';
    const imageProvider = row?.ai_image_provider || 'openai';
    return {
      text: {
        provider: textProvider,
        apiKey: row?.ai_text_api_key || config.openaiApiKey,
        model: row?.ai_text_model || (textProvider === 'gemini' ? 'gemini-2.0-flash' : config.openaiModel),
      },
      image: {
        provider: imageProvider,
        apiKey: row?.ai_image_api_key || config.openaiApiKey,
        model: row?.ai_image_model || (imageProvider === 'gemini' ? 'imagen-3.0-generate-002' : config.openaiImageModel),
      },
    };
  } catch {
    // DB not ready yet (during migration / first boot)
    return {
      text: { provider: 'openai', apiKey: config.openaiApiKey, model: config.openaiModel },
      image: { provider: 'openai', apiKey: config.openaiApiKey, model: config.openaiImageModel },
    };
  }
}

// ─── Text generation ───────────────────────────────────────────
export async function chatCompletion({ messages, model, jsonSchema, temperature = 0.7 }) {
  const cfg = getAIConfig().text;
  if (!cfg.apiKey) {
    throw new Error('Chave de IA para texto não configurada. Defina no painel admin → Inteligência Artificial.');
  }

  if (cfg.provider === 'gemini') {
    return geminiText({ messages, model: model || cfg.model, jsonSchema, temperature, apiKey: cfg.apiKey });
  }
  return openaiText({ messages, model: model || cfg.model, jsonSchema, temperature, apiKey: cfg.apiKey });
}

async function openaiText({ messages, model, jsonSchema, temperature, apiKey }) {
  const body = { model, messages, temperature };
  if (jsonSchema) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function geminiText({ messages, model, jsonSchema, temperature, apiKey }) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const body = { contents, generationConfig: { temperature } };
  if (jsonSchema) body.generationConfig.responseMimeType = 'application/json';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Image generation ───────────────────────────────────────────
// Returns a Buffer with the image bytes (caller writes to disk)
export async function generateImage({ prompt, size = '1792x1024' }) {
  const cfg = getAIConfig().image;
  if (!cfg.apiKey) {
    throw new Error('Chave de IA para imagens não configurada. Defina no painel admin → Inteligência Artificial.');
  }

  if (cfg.provider === 'gemini') {
    return geminiImage({ prompt, cfg });
  }
  return openaiImage({ prompt, size, cfg });
}

async function openaiImage({ prompt, size, cfg }) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, prompt, n: 1, size, response_format: 'url' }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) return null;
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error('Failed to download generated image');
  return Buffer.from(await imgRes.arrayBuffer());
}

async function geminiImage({ prompt, cfg }) {
  const model = cfg.model || 'imagen-3.0-generate-002';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${cfg.apiKey}`;
  const body = { instances: [{ prompt }], parameters: { sampleCount: 1 } };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) return null;
  return Buffer.from(b64, 'base64');
}