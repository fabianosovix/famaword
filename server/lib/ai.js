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
export async function generateImage({ prompt, size = '1536x1024' }) {
  const cfg = getAIConfig().image;
  if (!cfg.apiKey) {
    throw new Error('Chave de IA para imagens não configurada. Defina no painel admin → Inteligência Artificial.');
  }

  if (cfg.provider === 'gemini') {
    return geminiImage({ prompt, cfg });
  }
  const providerSize = cfg.model.startsWith('dall-e-') ? '1792x1024' : size;
  return openaiImage({ prompt, size: providerSize, cfg });
}

// Temporary source only: the client converts to 1200x675 WebP before saving.
export async function generateImageSource(prompt) {
  const buffer = await generateImage({ prompt });
  if (!buffer?.length) throw new Error('A IA não retornou uma imagem.');
  const mime = buffer.subarray(0, 4).toString() === 'RIFF' ? 'image/webp'
    : buffer[0] === 0xff ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function openaiImage({ prompt, size, cfg }) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ model: cfg.model, prompt, n: 1, size }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  const image = data.data?.[0];
  if (image?.b64_json) return Buffer.from(image.b64_json, 'base64');
  const imageUrl = image?.url;
  if (!imageUrl) throw new Error('A IA não retornou uma imagem.');
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
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
    signal: AbortSignal.timeout(180000),
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