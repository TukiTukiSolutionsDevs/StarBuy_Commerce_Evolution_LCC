/**
 * Free Web Search — No API key required
 *
 * Uses the DuckDuckGo HTML endpoint to fetch search results.
 * Parses the raw HTML with regex — no external parser dependencies.
 *
 * Designed to be respectful: adds a small delay between calls.
 */

// ─── Types ───────────────────────────────────────────────────────────────────────

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

// ─── HTML parser ─────────────────────────────────────────────────────────────────

function parseResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML search results follow this structure:
  // <h2 class="result__title"><a class="result__a" href="...">Title</a></h2>
  // <a class="result__snippet" ...>Snippet text</a>
  //
  // We extract up to 10 results using regex.
  // Extract title blocks and snippet blocks separately
  const titleMatches: Array<{ url: string; title: string }> = [];
  const snippetMatches: string[] = [];

  // Extract titles and URLs
  let tMatch: RegExpExecArray | null;
  const titleRe = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  while ((tMatch = titleRe.exec(html)) !== null) {
    const url = tMatch[1];
    // Strip any inner HTML tags from title
    const title = tMatch[2].replace(/<[^>]+>/g, '').trim();
    if (url && title) {
      titleMatches.push({ url, title });
    }
  }

  // Extract snippets
  let sMatch: RegExpExecArray | null;
  const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  while ((sMatch = snippetRe.exec(html)) !== null) {
    const snippet = sMatch[1].replace(/<[^>]+>/g, '').trim();
    if (snippet) {
      snippetMatches.push(snippet);
    }
  }

  // Pair titles with snippets
  const count = Math.min(titleMatches.length, snippetMatches.length);
  for (let i = 0; i < count; i++) {
    results.push({
      title: titleMatches[i].title,
      url: titleMatches[i].url,
      snippet: snippetMatches[i],
    });
  }

  // If pairing failed (HTML structure changed), try alternate extraction
  if (results.length === 0 && titleMatches.length > 0) {
    for (const tm of titleMatches) {
      results.push({ title: tm.title, url: tm.url, snippet: '' });
    }
  }

  return results;
}

// ─── Delay helper ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Public API ──────────────────────────────────────────────────────────────────

/**
 * Search the web using DuckDuckGo HTML endpoint.
 * No API key required. Returns up to `maxResults` results.
 * On failure returns an empty array (never throws).
 */
export async function searchWeb(query: string, maxResults = 5): Promise<SearchResult[]> {
  // Be respectful — small delay between requests
  await sleep(300);

  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StarBuyBot/1.0)',
        Accept: 'text/html',
      },
    });

    if (!res.ok) {
      console.warn(`[search-free] DuckDuckGo returned ${res.status} for query: ${query}`);
      return [];
    }

    const html = await res.text();
    const results = parseResults(html);
    return results.slice(0, maxResults);
  } catch (err) {
    console.warn(`[search-free] fetch error for query "${query}":`, err);
    return [];
  }
}
