import { Router, Request, Response } from 'express';
import axios from 'axios';
import { isSafeUrl } from '../utils.ts';

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
    const { url, provider } = req.query;
    if (!url && !provider) return res.status(400).json({ error: 'Missing URL or Provider' });
    
    const urlStr = (url || 'https://duckduckgo.com') as string;
    if (urlStr && !isSafeUrl(urlStr)) {
        return res.status(403).json({ error: 'Forbidden: Unsafe URL provided' });
    }

    try {
        const searchParams = new URLSearchParams();
        Object.keys(req.query).forEach(key => {
            if (key !== 'url' && key !== 'provider') {
                searchParams.append(key, req.query[key] as string);
            }
        });

        const q = searchParams.get('q') || '';
        const kp = searchParams.get('kp') || '-2'; 
        const kl = searchParams.get('kl') || 'wt-wt';
        
        let results: { title: string; url: string; content: string; source?: string }[] = [];
        let proxyError: string | null = null;
        let proxyStatusCode: number | null = null;

        // User-Agent Rotation - expanded list
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:125.0) Gecko/20100101 Firefox/125.0',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edge/123.0.0.0'
        ];
        const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];

        // Helper for providers to avoid redundant code
        const searchProvider = provider || (urlStr.includes('duckduckgo.com') ? 'duckduckgo' : 'searxng');

        if (searchProvider === 'duckduckgo') {
            console.log(`[PROXY] Searching DuckDuckGo for: ${q}`);
            
            // 1. Try the Instant Answer API (usually most stable)
            try {
                const ddgApiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&kl=${kl}&kp=${kp}`;
                const apiResponse = await axios.get(ddgApiUrl, { 
                    timeout: 4000, 
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LouisAI/1.0; +https://ren-ai-ssance.de)' } 
                });
                
                if (apiResponse.data && apiResponse.data.AbstractText) {
                    results.push({
                        title: apiResponse.data.Heading || 'DuckDuckGo Answer',
                        url: apiResponse.data.AbstractURL || urlStr,
                        content: apiResponse.data.AbstractText,
                        source: 'api'
                    });
                }
            } catch (e) {
                console.warn("[PROXY] DDG API failed (expected for non-answer queries)");
            }

            // 2. HTML Scraping (Fragile but rich)
            if (q && results.length < 5) {
                try {
                    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=${kl}&kp=${kp}`;
                    const response = await axios.get(searchUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': randomUA,
                            'Referer': 'https://duckduckgo.com/',
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                            'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
                            'Sec-Fetch-Dest': 'document',
                            'Sec-Fetch-Mode': 'navigate',
                            'Sec-Fetch-Site': 'same-origin',
                            'Upgrade-Insecure-Requests': '1'
                        }
                    });
                    const html = response.data;
                    
                    if (html.includes('id="error_homepage"') || html.includes('captcha') || html.includes('Verification Required') || html.includes('ddg-laptcha')) {
                        console.warn("[PROXY] DuckDuckGo HTML blocked (Bot detection). Setting proxyStatusCode but continuing to fallbacks.");
                        proxyError = "Blocked by DuckDuckGo (Bot detection).";
                        proxyStatusCode = 429;
                    } else {
                        // Improved Regex for HTML results
                        const resultMatches = html.match(/<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || 
                                              html.match(/<div[^>]+class="links_main links_deep[^"]*"[\s\S]*?<\/div>/g);
                        
                        if (resultMatches) {
                            resultMatches.slice(0, 8).forEach((block: string) => {
                                const titleMatch = block.match(/<a[^>]+class="[^"]*result__a"[^>]*>([\s\S]*?)<\/a>/) ||
                                                   block.match(/<a[^>]+class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/a>/);
                                const urlMatch = block.match(/href="([^"]+)"/);
                                const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) ||
                                                     block.match(/<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/);
                                
                                if (titleMatch && urlMatch) {
                                    let finalUrl = urlMatch[1];
                                    if (finalUrl.includes('uddg=')) {
                                        try { finalUrl = decodeURIComponent(finalUrl.split('uddg=')[1].split('&')[0]); } catch (e) {}
                                    }
                                    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
                                    
                                    if (!results.some(r => r.url === finalUrl)) {
                                        results.push({
                                            title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
                                            url: finalUrl,
                                            content: (snippetMatch ? snippetMatch[1] : '').replace(/<[^>]*>/g, '').trim().slice(0, 500)
                                        });
                                    }
                                }
                            });
                        }
                    }
                } catch (scrapeErr: unknown) {
                    const err = scrapeErr as { message: string, response?: { status: number } };
                    console.warn("[PROXY] DuckDuckGo Scraper error:", err.message);
                    proxyError = err.message;
                    proxyStatusCode = err.response?.status ?? null;
                }
            }

            // 3. DuckDuckGo Lite (Most stable fallback)
            if (q && results.length < 3) {
                try {
                    const liteUrl = `https://duckduckgo.com/lite/?q=${encodeURIComponent(q)}&kl=${kl}`;
                    const response = await axios.get(liteUrl, {
                        timeout: 8000,
                        headers: { 
                            'User-Agent': userAgents[1], // Use a different UA for Lite
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                        }
                    });
                    const html = response.data;
                    const tableRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g);
                    if (tableRows) {
                        tableRows.forEach((row: string) => {
                            const linkMatch = row.match(/<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
                            const snippetMatch = row.match(/<td class="result-snippet">([\s\S]*?)<\/td>/);
                            
                            if (linkMatch) {
                                let url = linkMatch[1];
                                if (url.startsWith('//')) url = 'https:' + url;
                                if (!results.some(r => r.url === url)) {
                                    results.push({
                                        title: linkMatch[2].replace(/<[^>]*>/g, '').trim(),
                                        url: url,
                                        content: (snippetMatch ? snippetMatch[1] : '').replace(/<[^>]*>/g, '').trim().slice(0, 500)
                                    });
                                }
                            }
                        });
                    }
                } catch (e) {
                     console.warn("[PROXY] DDG Lite fallback failed");
                }
            }
        } else if (searchProvider === 'brave') {
            console.log(`[PROXY] Searching Brave for: ${q}`);
            try {
                const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web`;
                const response = await axios.get(searchUrl, {
                    timeout: 10000,
                    headers: {
                        'User-Agent': randomUA,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                        'Sec-GPC': '1'
                    }
                });
                const html = response.data;
                const resultMatches = html.match(/<div[^>]+class="[^"]*snippet[^"]*"[\s\S]*?<\/div>/g);
                if (resultMatches) {
                    resultMatches.forEach((block: string) => {
                        const titleMatch = block.match(/<span[^>]+class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/) ||
                                           block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
                        const urlMatch = block.match(/href="([^"]+)"/);
                        const snippetMatch = block.match(/<div[^>]+class="[^"]*snippet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/) ||
                                             block.match(/<p[^>]+class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/);
                        
                        if (titleMatch && urlMatch) {
                            const url = urlMatch[1];
                            if (!results.some(r => r.url === url)) {
                                results.push({
                                    title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
                                    url: url,
                                    content: (snippetMatch ? snippetMatch[1] : '').replace(/<[^>]*>/g, '').trim()
                                });
                            }
                        }
                    });
                }
                if (results.length === 0) {
                    console.warn(`[PROXY] Brave search returned 200 but 0 results parsed. q=${q}`);
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                proxyError = errorMessage;
                proxyStatusCode = (err as { response?: { status: number } }).response?.status ?? null;
            }
        } else if (searchProvider === 'google') {
            console.log(`[PROXY] Searching Google (Scraper) for: ${q}`);
            try {
                const hl = kl.startsWith('de') ? 'de' : 'en';
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=${hl}&num=10`;
                const response = await axios.get(searchUrl, {
                    timeout: 10000,
                    headers: { 
                        'User-Agent': randomUA,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Referer': 'https://www.google.com/'
                    }
                });
                const html = response.data;
                const resultMatches = html.match(/<div class="g">[\s\S]*?<\/div><\/div><\/div>/g) || 
                                      html.match(/<div[^>]+class="[^"]*MjjYud[^"]*"[\s\S]*?<\/div>/g) ||
                                      html.match(/<div[^>]+class="[^"]*Gx5uV[^"]*"[\s\S]*?<\/div>/g);
                
                if (resultMatches) {
                    resultMatches.forEach((block: string) => {
                        const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
                        const urlMatch = block.match(/href="([^"]+)"/);
                        const snippetMatch = block.match(/<div[^>]+style="-webkit-line-clamp:2"[^>]*>([\s\S]*?)<\/div>/) ||
                                             block.match(/<div[^>]+class="VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/);
                        
                        if (titleMatch && urlMatch && !urlMatch[1].includes('google.com/')) {
                            let url = urlMatch[1];
                            if (!results.some(r => r.url === url)) {
                                results.push({
                                    title: titleMatch[1].replace(/<[^>]*>/g, '').trim(),
                                    url: url,
                                    content: (snippetMatch ? snippetMatch[1] : '').replace(/<[^>]*>/g, '').trim()
                                });
                            }
                        }
                    });
                }
                if (results.length === 0) {
                    console.warn(`[PROXY] Google search returned 200 but 0 results parsed. q=${q}`);
                }
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                proxyError = errorMessage;
                proxyStatusCode = (err as { response?: { status: number } }).response?.status ?? null;
            }
        } else {
            // SearXNG / Other
            const baseUrl = urlStr.endsWith('/') ? urlStr.slice(0, -1) : urlStr;
            const pathSuffix = baseUrl.endsWith('/search') ? '' : '/search';
            if (!searchParams.has('format')) searchParams.append('format', 'json');
            if (!searchParams.has('categories')) searchParams.append('categories', 'general');
            
            const targetUrl = `${baseUrl}${pathSuffix}?${searchParams.toString()}`;
            const response = await axios.get(targetUrl, {
                timeout: 10000,
                headers: { 'Accept': 'application/json' },
                validateStatus: null 
            });

            if (response.status < 400) {
                return res.json(response.data);
            } else {
                return res.status(response.status).json({ error: 'Search target failed', status: response.status });
            }
        }

        // UNIVERSAL FALLBACK: If we still have nothing, try DuckDuckGo Lite as it's the most bot-resistant
        if (results.length === 0) {
            console.log(`[PROXY] No results from primary method. Trying universal fallback (DDG Lite)...`);
            try {
                const liteUrl = `https://duckduckgo.com/lite/?q=${encodeURIComponent(q)}&kl=${kl}`;
                const response = await axios.get(liteUrl, {
                    timeout: 6000,
                    headers: { 'User-Agent': userAgents[0] }
                });
                const html = response.data;
                const tableRows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g);
                if (tableRows) {
                    tableRows.forEach((row: string) => {
                        const linkMatch = row.match(/<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
                        if (linkMatch) {
                            let url = linkMatch[1];
                            if (url.startsWith('//')) url = 'https:' + url;
                            if (!results.some(r => r.url === url)) {
                                results.push({
                                    title: linkMatch[2].replace(/<[^>]*>/g, '').trim(),
                                    url: url,
                                    content: row.match(/<td class="result-snippet">([\s\S]*?)<\/td>/)?.[1].replace(/<[^>]*>/g, '').trim().slice(0, 500) || '',
                                    source: 'fallback'
                                });
                            }
                        }
                    });
                }
            } catch (e) {
                console.warn("[PROXY] Universal fallback also failed");
            }
        }

        // Final decision logic
        if (results.length > 0) {
            return res.json({ results: results.slice(0, 10) });
        }

        if (proxyError && proxyStatusCode === 429) {
             return res.status(429).json({ 
                error: "Rate-Limit erreicht", 
                details: "Der Suchanbieter blockiert automatisierte Anfragen. Verwenden Sie SearXNG für mehr Stabilität.",
                results: [] 
            });
        }

        return res.status(200).json({ 
            message: 'No results found', 
            results: [] 
        });
    } catch (error: unknown) {
        const err = error as { message: string };
        console.error('Proxy Search Error:', err.message);
        res.status(500).json({ error: 'Search Proxy failed', details: err.message });
    }
});

router.get('/generic', async (req: Request, res: Response) => {
    const { url, headers } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing URL' });
    
    const urlStr = url as string;
    if (!isSafeUrl(urlStr)) {
        return res.status(403).json({ error: 'Forbidden: Unsafe URL provided' });
    }

    try {
        const requestedHeaders: Record<string, string> = {};
        if (headers && typeof headers === 'string') {
            try {
                const parsed = JSON.parse(headers);
                Object.assign(requestedHeaders, parsed);
            } catch (e) {}
        }

        const response = await axios.get(urlStr, {
            headers: {
                ...requestedHeaders,
                'User-Agent': 'Mozilla/5.0 LouisAI/1.0'
            },
            timeout: 10000,
            validateStatus: null
        });

        res.status(response.status).json(response.data);
    } catch (error: unknown) {
        const err = error as { message: string };
        res.status(500).json({ error: 'Proxy failed', details: err.message });
    }
});

router.post('/generic', async (req: Request, res: Response) => {
    const { url, body, headers, method } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing URL' });
    
    if (!isSafeUrl(url)) {
        return res.status(403).json({ error: 'Forbidden: Unsafe URL provided' });
    }

    try {
        const requestedHeaders: Record<string, string> = {};
        if (headers) {
            Object.assign(requestedHeaders, headers);
        }

        const response = await axios({
            url: url,
            method: method || 'POST',
            data: body,
            headers: {
                ...requestedHeaders,
                'User-Agent': 'Mozilla/5.0 LouisAI/1.0'
            },
            timeout: 60000,
            validateStatus: null
        });

        res.status(response.status).json(response.data);
    } catch (error: unknown) {
        const err = error as { message: string };
        res.status(500).json({ error: 'Post Proxy failed', details: err.message });
    }
});

router.post('/ollama', async (req: Request, res: Response) => {
    const { url, body } = req.body;
    if (!url) return res.status(400).json({ error: 'Missing URL' });

    if (!isSafeUrl(url)) {
        return res.status(403).json({ error: 'Forbidden: Unsafe URL provided' });
    }

    try {
        const response = await axios.post(url, body, {
            timeout: 60000,
            responseType: 'stream',
            validateStatus: null
        });
        
        if (response.status >= 400) {
            if (String(response.headers['content-type'] || '').includes('application/json')) {
               res.status(response.status);
               response.data.pipe(res);
            } else {
               res.status(response.status).json({ error: 'Ollama target failed', status: response.status });
            }
            return;
        }

        res.status(200);
        response.data.pipe(res);
    } catch (error: unknown) {
        const err = error as { message: string };
        res.status(500).json({ error: 'Ollama Proxy failed', details: err.message });
    }
});

export default router;
