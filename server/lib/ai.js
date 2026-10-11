import { config } from '../config.js';

// Calls an OpenAI-compatible chat completions endpoint.
// Works with OpenAI, Azure OpenAI, OpenRouter, local LM Studio, etc.
export async function chatCompletion({ messages, model, jsonSchema, temperature = 0.7 }) {
  if (!config.openaiApiKey) throw new Error('OPENAI_API_KEY not configured. Set it in .env');

  const body = {
    model: model || config.openaiModel,
    messages,
    temperature,
  };
  if (jsonSchema) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return content;
}

// Generate a cover image via DALL-E
export async function generateImage({ prompt, size = '1792x1024' }) {
  if (!config.openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiImageModel,
      prompt,
      n: 1,
      size,
      response_format: 'url',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.data?.[0]?.url || null;
}

// Download an image URL and save locally (for AI-generated covers)
export async function downloadImage(url, destPath) {
  const fs = await import('fs');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}