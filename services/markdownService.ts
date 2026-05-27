/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

export const simpleMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    // 1. Markdown Images ![alt](url)
    let html = markdown.replace(/!\[(.*?)\]\s*\((.*?)\)/g, (_match, alt, url) => {
        const src = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
        return `<img src="${src}" alt="${alt}" loading="lazy" class="ai-rendered-image" />`;
    });

    // 1b. Markdown Links [text](url)
    html = html.replace(/\[((?:[^\]]|\\\])*)\]\s*\(((?:[^)]|\\\))*)\)/g, (_match, text, url) => {
        const href = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
        return `@@LINK_START@@${href}@@LINK_SEP@@${text}@@LINK_END@@`;
    });

    // 2. HTML-Zeichen maskieren
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 3. Raw URLs linkify (aber NICHT innerhalb unserer Tokens)
    const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;!?"')\]]/gi;
    html = html.replace(urlRegex, (url) => {
        // Prüfen ob wir gerade in einem Link-Token sind (simpel)
        if (html.indexOf(`@@LINK_START@@${url}`) !== -1) return url;
        
        const href = url.startsWith('www.') ? `http://${url}` : url;
        return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`;
    });

    // 4. Tokens zurückerstatten
    html = html.replace(/@@LINK_START@@(.*?)@@LINK_SEP@@(.*?)@@LINK_END@@/g, (_match, url, text) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${text}</a>`;
    });

    // 5. Andere Markdown-Elemente
    const lines = html.split('\n');
    let finalHtml = '';
    let inList = false;
    let listType: 'ul' | 'ol' | null = null;
    let inCodeBlock = false;
    let inBlockquote = false;
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let processedLine = line;

        // Code block toggle
        if (processedLine.trim().startsWith('```')) {
            if (inCodeBlock) {
                finalHtml += '</code></pre>';
                inCodeBlock = false;
            } else {
                const lang = processedLine.trim().substring(3).trim();
                finalHtml += `<pre><code class="language-${lang}">`;
                inCodeBlock = true;
            }
            continue;
        }

        if (inCodeBlock) {
            finalHtml += processedLine + '\n';
            continue;
        }

        // Blockquotes
        if (processedLine.trim().startsWith('&gt;')) {
            if (!inBlockquote) {
                finalHtml += '<blockquote>';
                inBlockquote = true;
            }
            processedLine = processedLine.trim().substring(4).trim();
        } else if (inBlockquote) {
            finalHtml += '</blockquote>';
            inBlockquote = false;
        }

        // Table support
        if (processedLine.trim().startsWith('|') && processedLine.trim().endsWith('|')) {
            const cells = processedLine.split('|').filter((_c, index, array) => index > 0 && index < array.length - 1);
            
            if (processedLine.includes('---')) {
                // Divider line, skip
                continue;
            }
            
            if (!inTable) {
                finalHtml += '<div class="table-container"><table><thead><tr>';
                cells.forEach(c => finalHtml += `<th>${c.trim()}</th>`);
                finalHtml += '</tr></thead><tbody>';
                inTable = true;
            } else {
                finalHtml += '<tr>';
                cells.forEach(c => finalHtml += `<td>${c.trim()}</td>`);
                finalHtml += '</tr>';
            }
            continue;
        } else if (inTable && !processedLine.trim().startsWith('|')) {
            finalHtml += '</tbody></table></div>';
            inTable = false;
        }

        // Headers
        if (processedLine.trim().startsWith('### ')) {
            finalHtml += `<h3>${processedLine.trim().substring(4)}</h3>`;
            continue;
        } else if (processedLine.trim().startsWith('## ')) {
            finalHtml += `<h2>${processedLine.trim().substring(3)}</h2>`;
            continue;
        } else if (processedLine.trim().startsWith('# ')) {
            finalHtml += `<h1>${processedLine.trim().substring(2)}</h1>`;
            continue;
        }

        processedLine = processedLine
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>'); // Inline code

        // Lists
        const ulMatch = processedLine.match(/^(\s*)([*-])\s+(.*)/);
        const olMatch = processedLine.match(/^(\s*)(\d+)\.\s+(.*)/);

        if (ulMatch || olMatch) {
            const currentType = ulMatch ? 'ul' : 'ol';
            const content = ulMatch ? ulMatch[3] : olMatch![3];

            if (!inList || listType !== currentType) {
                if (inList) finalHtml += listType === 'ul' ? '</ul>' : '</ol>';
                finalHtml += currentType === 'ul' ? '<ul>' : '<ol>';
                inList = true;
                listType = currentType;
            }
            finalHtml += `<li>${content}</li>`;
        } else {
            if (inList) {
                finalHtml += listType === 'ul' ? '</ul>' : '</ol>';
                inList = false;
                listType = null;
            }
            if (processedLine.trim()) {
                finalHtml += `<p>${processedLine}</p>`;
            }
        }
    }

    if (inCodeBlock) finalHtml += '</code></pre>';
    if (inList) finalHtml += listType === 'ul' ? '</ul>' : '</ol>';
    if (inBlockquote) finalHtml += '</blockquote>';
    if (inTable) finalHtml += '</tbody></table></div>';

    return finalHtml;
};
