import { AiTool, ToolResult, FinancialToolContext } from './types.ts';

interface SearchResult {
  title: string;
  url: string;
  content?: string;
  snippet?: string;
}

export class SearchTool implements AiTool {
  id = 'web_search';
  name = 'Web Search';
  description = 'Sucht nach aktuellen Marktdaten, Preisen, Steuersätzen oder Trends im Internet.';

  private baseUrlMap: Record<string, string> = {
    duckduckgo: 'https://duckduckgo.com',
    google: 'https://www.google.com',
    brave: 'https://search.brave.com',
    searxng: 'https://searx.be'
  };

  async execute(query: string, context: FinancialToolContext = {} as FinancialToolContext): Promise<ToolResult> {
    try {
      const provider = context.searchProvider || 'duckduckgo';
      const baseUrl = (context.searchProvider && context.searchProvider !== 'duckduckgo')
        ? (context.searchProvider === 'searxng' ? (context.searchUrl || 'https://searx.be') : (this.baseUrlMap[context.searchProvider as string] || context.searchUrl || 'https://duckduckgo.com'))
        : (context.searchUrl || 'https://duckduckgo.com');
      
      const safeSearch = context.searchSafeSearch || '0';
      const region = context.searchRegion || 'all';
      let results: SearchResult[] = [];
      
      const isDDG = provider === 'duckduckgo';

      // Use server-side proxy
      const proxyUrl = new URL('/api/proxy/search', window.location.origin);
      proxyUrl.searchParams.append('url', baseUrl);
      proxyUrl.searchParams.append('q', query);
      proxyUrl.searchParams.append('provider', provider);
      
      console.log(`SearchTool: Executing search for "${query}" via ${provider} (${baseUrl})`);
      
      // Add DDG specific params if it's DDG
      if (isDDG || provider === 'google' || provider === 'brave') {
        const ddgSafe = safeSearch === '0' ? '-2' : (safeSearch === '2' ? '1' : '-1');
        proxyUrl.searchParams.append('kp', ddgSafe);
        
        const ddgRegion = region === 'all' ? 'wt-wt' : region.toLowerCase();
        if (ddgRegion !== 'wt-wt') {
            proxyUrl.searchParams.append('kl', ddgRegion);
        }
      } else {
        proxyUrl.searchParams.append('safesearch', safeSearch);
        if (region !== 'all') proxyUrl.searchParams.append('language', region);
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (context.projectToken) {
        headers['x-project-token'] = context.projectToken;
      }
      
      const response = await fetch(proxyUrl.toString(), { headers });
      if (response.ok) {
        const data = await response.json();
        
        if (data.results && Array.isArray(data.results)) {
          results = data.results.slice(0, 10) as SearchResult[];
        } else if (data.error) {
           console.error("SearchTool: Proxy returned error:", data.error);
        }
      } else {
        console.warn(`SearchTool proxy failed: ${response.status} ${response.statusText}`);
      }

      results = results.filter(r => r && r.url && r.url.length > 0);
      
      if (results.length === 0) {
        console.log("SearchTool: no results found for query:", query);
        return { 
            success: true, 
            contextAddition: `\n\n[System: Die Websuche nach "${query}" lieferte keine Ergebnisse über ${provider}. Bitte verwende alternatives Wissen oder schlage dem Nutzer eine Verfeinerung vor.]` 
        };
      }

      const text = results
        .map((r: SearchResult) => `Quelle: ${r.title}\nURL: ${r.url}\nInhalt: ${r.content || r.snippet || ''}`)
        .join('\n\n');
      
      const sources = results
        .filter((r: SearchResult) => r.url && r.url.startsWith('http'))
        .map((r: SearchResult) => ({
          uri: r.url,
          title: r.title || r.url
        }));

      return { 
        success: true, 
        data: results, 
        contextAddition: `\n\n### WEBSUCHE ERGEBNISSE (${query}):\n${text}`,
        sources 
      };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unbekannter Fehler bei der Websuche";
      console.warn("SearchTool failed", errorMessage);
      return { success: false, message: "Websuche fehlgeschlagen: " + errorMessage };
    }
  }
}
