// Minimaler Anthropic-Client (fetch-basiert, keine Abhaengigkeit).
const API = 'https://api.anthropic.com/v1/messages';

export async function ask(prompt, { system, maxTokens = 2000, temperature = 0.9 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY fehlt in .env');
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = await res.json();
  return (data.content || []).map(b => b.text || '').join('').trim();
}

// Robustes JSON aus einer Modellantwort ziehen (auch wenn Markdown drumherum steht).
export function extractJson(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  const arrA = text.indexOf('[');
  const arrB = text.lastIndexOf(']');
  let slice;
  if (arrA !== -1 && (arrA < a || a === -1)) slice = text.slice(arrA, arrB + 1);
  else slice = text.slice(a, b + 1);
  return JSON.parse(slice);
}
