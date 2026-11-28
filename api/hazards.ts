import type { VercelRequest, VercelResponse } from '@vercel/node';

const RSS_FEEDS = [
  'https://news.google.com/rss/search?q=(tanah+runtuh+OR+kemalangan+OR+jalan+tutup+OR+lencongan)+(Simpang+Pulai+OR+Gua+Musang+OR+Lojing+OR+Cameron+Highlands)&hl=ms&gl=MY&ceid=MY:ms',
  'https://news.google.com/rss/search?q=(landslide+OR+accident+OR+road+closure)+(Simpang+Pulai+OR+Gua+Musang+OR+Lojing+OR+Cameron+Highlands)&hl=en-MY&gl=MY&ceid=MY:en',
];

function decodeXml(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseRssItems(xml: string) {
  const items: Array<{ id: string; title: string; link: string; pubDate: string; source: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = itemRegex.exec(xml)) !== null && idx < 25) {
    const block = match[1];
    const title = decodeXml((block.match(/<title>([\s\S]*?)<\/title>/) || ['', ''])[1]);
    const link = decodeXml((block.match(/<link>([\s\S]*?)<\/link>/) || ['', ''])[1]);
    const pubDate = decodeXml((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || ['', ''])[1]);
    const source = decodeXml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || ['', 'Google News'])[1]);

    if (title) {
      items.push({
        id: `rss-${idx++}-${Buffer.from(title).toString('base64').slice(0, 10)}`,
        title,
        link,
        pubDate,
        source,
      });
    }
  }
  return items;
}

async function fetchRssHazards() {
  const settled = await Promise.allSettled(
    RSS_FEEDS.map(async (url) => {
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CamGoBot/1.0)' },
      });
      if (!resp.ok) throw new Error(`RSS HTTP ${resp.status}`);
      return resp.text();
    })
  );

  const combined = settled
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .flatMap((r) => parseRssItems(r.value));

  const seen = new Set<string>();
  return combined.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchGeminiGroundHazards(apiKey: string) {
  const prompt = `Search recent news and official Malaysian road/landslide updates (FT185 Simpang Pulai, FT185 Lojing-Gua Musang, FT59 Tapah, FT102 Sungai Koyan, Cameron Highlands). Return ONLY a JSON array of objects with keys: id, routeCode, title, severity ("low"|"medium"|"high"), summary, sourceUrl, reportedAt.`;

  for (const model of ['gemini-3.8-flash', 'gemini-2.5-flash']) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    });

    if (!resp.ok) continue;
    const data = await resp.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || '')
        .join('\n') || '';

    const start = rawText.indexOf('[');
    const end = rawText.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(rawText.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    }
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const mode = String(req.query.type || 'feed');
  const apiKey = process.env.GEMINI_API_KEY || '';

  try {
    if (mode === 'rss') {
      const items = await fetchRssHazards();
      return res.status(200).json({ ok: true, items, hazards: items });
    }

    if (mode === 'web-search') {
      const hazards = apiKey ? await fetchGeminiGroundHazards(apiKey) : [];
      return res.status(200).json({ ok: true, hazards });
    }

    const [grounded, rssItems] = await Promise.all([
      apiKey ? fetchGeminiGroundHazards(apiKey).catch(() => []) : Promise.resolve([]),
      fetchRssHazards().catch(() => []),
    ]);

    return res.status(200).json({
      ok: true,
      hazards: grounded,
      items: rssItems,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Hazard fetch failed';
    return res.status(500).json({ ok: false, error: message, hazards: [], items: [] });
  }
}
