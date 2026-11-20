import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

/**
 * Dynamically reads GEMINI_API_KEY from process.env or the workspace root `.env` file on disk.
 * Works immediately without restarting `npm run dev:web`, and works on Vercel via Environment Variables.
 */
function resolveServerApiKey(overrideKey?: string): string {
  const cleanedOverride = String(overrideKey || '').trim();
  if (cleanedOverride) return cleanedOverride;

  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim()) {
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY.trim();
  }

  const candidatePaths = [
    path.resolve(process.cwd(), '..', '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of candidatePaths) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const match = line.match(/^(?:export\s+)?(GEMINI_API_KEY|NEXT_PUBLIC_GEMINI_API_KEY)\s*=\s*(.+)$/);
        if (match) {
          let val = match[2].trim();
          if (!val.startsWith('"') && !val.startsWith("'")) {
            val = val.split(/\s+#/)[0].trim();
          }
          val = val.replace(/^['"]|['"]$/g, '').trim();
          if (val) return val;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return '';
}

export async function GET() {
  const key = resolveServerApiKey();
  return NextResponse.json({
    configured: Boolean(key),
    source: key ? '.env (GEMINI_API_KEY)' : 'none',
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body?.question || '').trim();
    const systemPrompt = String(body?.systemPrompt || '').trim();
    const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
    const cleanKey = resolveServerApiKey(body?.apiKey);

    if (!cleanKey || !question) {
      return NextResponse.json(
        { ok: false, reason: !cleanKey ? 'NO_API_KEY' : 'EMPTY_QUESTION' },
        { status: 200 },
      );
    }

    // Support Groq (gsk_...) or OpenAI (sk-...) keys in addition to Google Gemini (AIza...)
    if (cleanKey.startsWith('sk-') || cleanKey.startsWith('gsk_')) {
      const isGroq = cleanKey.startsWith('gsk_');
      const endpoint = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...history
          .filter((m: { id?: string }) => m?.id !== 'welcome-msg')
          .map((m: { role?: string; content?: string }) => ({
            role: m?.role === 'assistant' ? 'assistant' : 'user',
            content: String(m?.content || ''),
          })),
        { role: 'user', content: question },
      ];

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`,
        },
        body: JSON.stringify({ model, messages: chatMessages, temperature: 0.25 }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return NextResponse.json(
          { ok: false, reason: `HTTP_${resp.status}`, details: errText },
          { status: 200 },
        );
      }

      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        return NextResponse.json({
          ok: true,
          source: 'gemini-api',
          model,
          answer: text,
        });
      }
    }

    // Google Gemini API: try gemini-3.8-flash first, with automatic model discovery fallback
    const contents = [
      ...history
        .filter((m: { id?: string }) => m?.id !== 'welcome-msg')
        .map((m: { role?: string; content?: string }) => ({
          role: m?.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m?.content || '') }],
        })),
      { role: 'user', parts: [{ text: question }] },
    ];

    const candidateModels = [
      'gemini-3-flash-preview',
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite-preview',
    ];
    const errors: string[] = [];

    const callGeminiModel = async (modelId: string) => {
      const cleanModel = modelId.replace(/^models\//, '');
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(cleanKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.25,
            },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!resp.ok) {
        const errBody = await resp.text();
        errors.push(`${cleanModel}: HTTP ${resp.status} ${errBody.slice(0, 160)}`);
        return null;
      }
      const data = await resp.json();
      const parts: Array<{ thought?: boolean; text?: string }> =
        data?.candidates?.[0]?.content?.parts || [];
      const text =
        parts
          .filter((p) => !p?.thought && typeof p?.text === 'string')
          .map((p) => p.text)
          .join('\n') || parts?.[0]?.text;
      return text ? { model: cleanModel, answer: text } : null;
    };

    for (const modelName of candidateModels) {
      const hit = await callGeminiModel(modelName);
      if (hit) {
        return NextResponse.json({
          ok: true,
          source: 'gemini-api',
          model: hit.model,
          answer: hit.answer,
        });
      }
    }

    // Dynamic model discovery fallback if Google bumps model versions in the future
    try {
      const listResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`,
      );
      if (listResp.ok) {
        const listData = await listResp.json();
        const availableModels: Array<{ name?: string; supportedGenerationMethods?: string[] }> =
          listData?.models || [];
        const dynamicModel =
          availableModels.find(
            (m) =>
              m.name?.includes('flash') &&
              m.supportedGenerationMethods?.includes('generateContent'),
          ) ||
          availableModels.find(
            (m) =>
              m.name?.includes('gemini') &&
              m.supportedGenerationMethods?.includes('generateContent'),
          );
        if (dynamicModel?.name) {
          const hit = await callGeminiModel(dynamicModel.name);
          if (hit) {
            return NextResponse.json({
              ok: true,
              source: 'gemini-api',
              model: hit.model,
              answer: hit.answer,
            });
          }
        }
      }
    } catch {
      // Ignore model listing failure
    }

    return NextResponse.json(
      { ok: false, reason: 'GEMINI_MODELS_FAILED', details: errors.join(' | ') },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, reason: 'SERVER_EXCEPTION', details: String(err) },
      { status: 200 },
    );
  }
}
