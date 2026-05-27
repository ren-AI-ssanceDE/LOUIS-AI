import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import XLSX from 'xlsx';

/**
 * Validates a URL to prevent SSRF attacks by blocking internal/private IP ranges.
 */
export function isSafeUrl(urlStr: string): boolean {
    try {
        const url = new URL(urlStr);
        const hostname = url.hostname.toLowerCase();
        
        // Block explicitly forbidden hosts
        const blockedHosts = ['169.254.169.254', 'metadata.google.internal', 'metadata'];
        if (blockedHosts.some(h => hostname === h)) {
            console.warn(`[SAFE_URL] Blocked forbidden host: ${hostname}`);
            return false;
        }

        // Allow localhost and loopback specifically for local SearXNG
        if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

        // Block internal network ranges by default
        const isInternal = 
            hostname.startsWith('10.') || 
            hostname.startsWith('192.168.') ||
            (hostname.startsWith('172.') && hostname.split('.').length === 4 && (parseInt(hostname.split('.')[1]) >= 16 && parseInt(hostname.split('.')[1]) <= 31));

        if (isInternal) {
            console.warn(`[SAFE_URL] Internal IP access attempt blocked: ${hostname}`);
            return false;
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            console.warn(`[SAFE_URL] Unsupported protocol: ${url.protocol}`);
            return false;
        }

        return true;
    } catch (e) {
        console.error(`[SAFE_URL] Error parsing URL: ${urlStr}`);
        return false;
    }
}

/**
 * Extracts text from various file formats.
 */
export async function parseFileBuffer(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === 'application/pdf') {
        const data = await pdf(buffer);
        return data.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimetype === 'application/vnd.ms-excel') {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let text = "";
        workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            text += `--- Sheet: ${sheetName} ---\n`;
            text += XLSX.utils.sheet_to_csv(worksheet);
            text += "\n\n";
        });
        return text;
    } else {
        return buffer.toString('utf-8');
    }
}

/**
 * Splits text into optimized chunks for RAG.
 */
export function chunkText(text: string, maxChunkSize = 1000, chunkOverlap = 150): { text: string, sectionId: string }[] {
    const rawSections = text.split(/\n\s*\n|\r\n\s*\r\n/);
    const finalChunks: { text: string; sectionId: string }[] = [];
    let currentChunk = "";
    let sectionCount = 0;

    for (const section of rawSections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        if (trimmed.length > maxChunkSize) {
            const lines = trimmed.split('\n');
            for (const line of lines) {
                if ((currentChunk + line).length > maxChunkSize) {
                    if (currentChunk) finalChunks.push({ text: currentChunk, sectionId: `chunk-${sectionCount++}` });
                    currentChunk = (currentChunk.slice(-chunkOverlap) + "\n" + line).trim();
                } else {
                    currentChunk += (currentChunk ? "\n" : "") + line;
                }
            }
        } else {
            if ((currentChunk + "\n\n" + trimmed).length > maxChunkSize) {
                if (currentChunk) finalChunks.push({ text: currentChunk, sectionId: `chunk-${sectionCount++}` });
                currentChunk = (currentChunk.slice(-chunkOverlap) + "\n\n" + trimmed).trim();
            } else {
                currentChunk += (currentChunk ? "\n\n" : "") + trimmed;
            }
        }
    }
    if (currentChunk) finalChunks.push({ text: currentChunk, sectionId: `chunk-${sectionCount++}` });
    return finalChunks;
}
