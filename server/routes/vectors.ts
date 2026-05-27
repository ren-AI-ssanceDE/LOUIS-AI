import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { dbService } from '../../services/dbService.ts';
import { parseFileBuffer, chunkText } from '../utils.ts';
import { env, pipeline } from '@xenova/transformers';

// Configure transformers to use a local cache directory within the project
const CACHE_DIR = path.join(process.cwd(), 'data', 'models');
fs.ensureDirSync(CACHE_DIR);
env.cacheDir = CACHE_DIR;
env.allowLocalModels = false; // Ensure it downloads if not found in cache

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

type Embedder = (text: string, options: { pooling: 'none' | 'mean' | 'cls', normalize: boolean }) => Promise<{ data: number[] }>;
let embedder: Embedder | null = null;

async function getEmbedder(): Promise<Embedder> {
    if (!embedder) {
        try {
            console.log(`[AI] Loading transformers pipeline (Cache: ${CACHE_DIR})...`);
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2') as Embedder;
            console.log('[AI] Transformers ready.');
        } catch (err) {
            console.error('[AI] Failed to load transformers pipeline:', err);
            throw new Error(`Embedding-Modell konnte nicht geladen werden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
        }
    }
    if (!embedder) throw new Error("Embedder initialization failed");
    return embedder;
}

/**
 * Resilient multi-provider embedding generator.
 * Tries several fallback APIs if local Xenova loading is slow or fails due to network/CPU/g++ issues,
 * and forces structural 384-dimensional arrays to ensure compatibility with LanceDB database schemas.
 */
async function generateEmbeddingsForTexts(texts: string[]): Promise<number[][]> {
    let aiSettings: any = null;
    try {
        aiSettings = await dbService.getGlobalSetting('aiSettings');
    } catch (e) {
        console.warn("[VECTORS] Could not load aiSettings from db, using defaults:", e);
    }

    const provider = aiSettings?.provider || 'local';
    const geminiKey = aiSettings?.apiKeyGemini || process.env.GEMINI_API_KEY;
    const openAiKey = aiSettings?.apiKeyOpenAI || process.env.OPENAI_API_KEY;
    const openAiBase = aiSettings?.openAiBaseUrl || "https://api.openai.com/v1";
    const ollamaUrl = aiSettings?.ollamaUrl || process.env.OLLAMA_URL || "http://localhost:11434";

    const strategies: Array<{ name: string; action: () => Promise<number[][]> }> = [];

    // Local transformers (Xenova / all-MiniLM-L6-v2)
    const runLocalTransformers = async () => {
        const embed = await getEmbedder();
        return await Promise.all(texts.map(async (text) => {
            const result = await embed(text, { pooling: 'mean', normalize: true });
            return Array.from(result.data);
        }));
    };

    // Gemini Embeddings API (text-embedding-004)
    const runGemini = async () => {
        if (!geminiKey) throw new Error("No Gemini API key available");
        console.log(`[VECTORS] Generating embeddings with Gemini (text-embedding-004) for ${texts.length} texts...`);
        return await Promise.all(texts.map(async (text) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: { parts: [{ text }] },
                    outputDimensionality: 384
                })
            });
            if (!response.ok) {
                const textErr = await response.text();
                throw new Error(`Gemini embedding failed [${response.status}]: ${textErr}`);
            }
            const data = await response.json() as any;
            if (!data.embedding?.values) {
                throw new Error("Invalid Gemini embedding response structure");
            }
            return data.embedding.values;
        }));
    };

    // OpenAI Embeddings (text-embedding-3-small with dimensions 384 constraint)
    const runOpenAI = async () => {
        if (!openAiKey) throw new Error("No OpenAI API key available");
        console.log(`[VECTORS] Generating embeddings with OpenAI (text-embedding-3-small) for ${texts.length} texts...`);
        return await Promise.all(texts.map(async (text) => {
            const response = await fetch(`${openAiBase}/embeddings`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openAiKey}`
                },
                body: JSON.stringify({
                    model: "text-embedding-3-small",
                    input: text,
                    dimensions: 384
                })
            });
            if (!response.ok) {
                const textErr = await response.text();
                throw new Error(`OpenAI embedding failed [${response.status}]: ${textErr}`);
            }
            const data = await response.json() as any;
            if (!data.data?.[0]?.embedding) {
                throw new Error("Invalid OpenAI embedding response structure");
            }
            return data.data[0].embedding;
        }));
    };

    // Ollama local embeddings
    const runOllama = async () => {
        console.log(`[VECTORS] Generating embeddings with Ollama for ${texts.length} texts...`);
        return await Promise.all(texts.map(async (text) => {
            const response = await fetch(`${ollamaUrl}/api/embeddings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "nomic-embed-text",
                    prompt: text
                })
            });
            if (!response.ok) {
                const textErr = await response.text();
                throw new Error(`Ollama embedding failed [${response.status}]: ${textErr}`);
            }
            const data = await response.json() as any;
            if (!data.embedding) {
                throw new Error("Invalid Ollama embedding response");
            }
            return data.embedding;
        }));
    };

    // Zero-dependency local deterministic sparse random projection fallback (like Random Indexing)
    const runDeterministicHashFallback = async () => {
        console.log(`[VECTORS] Falling back to Zero-Dependency Deterministic Word-Hash space for ${texts.length} texts...`);
        return texts.map(text => {
            const vector = new Array(384).fill(0);
            const words = text.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
                .split(/\s+/)
                .filter(w => w.length > 2);
            
            if (words.length === 0) {
                vector[0] = 1.0;
                return vector;
            }

            for (const word of words) {
                // Determine a simple polynomial rolling hash for the word
                let hash = 0;
                for (let i = 0; i < word.length; i++) {
                    hash = (hash * 31 + word.charCodeAt(i)) | 0;
                }
                
                // Map the word hash to 3 sparse projection indices
                for (let step = 0; step < 3; step++) {
                    const seed = (hash + step * 104729) | 0;
                    const index = Math.abs(seed) % 384;
                    const value = (seed % 2 === 0) ? 1 : -1;
                    vector[index] += value;
                }
            }

            // L2-Normalize vector to unit length
            let norm = 0;
            for (let i = 0; i < 384; i++) norm += vector[i] * vector[i];
            norm = Math.sqrt(norm);
            if (norm > 0) {
                for (let i = 0; i < 384; i++) vector[i] /= norm;
            } else {
                vector[0] = 1.0;
            }

            return vector;
        });
    };

    // Prioritize strategy based on settings provider
    if (provider === 'gemini') {
        strategies.push({ name: 'Gemini API', action: runGemini });
        strategies.push({ name: 'Local Transformers', action: runLocalTransformers });
        strategies.push({ name: 'OpenAI API', action: runOpenAI });
        strategies.push({ name: 'Ollama API', action: runOllama });
    } else if (provider === 'openai') {
        strategies.push({ name: 'OpenAI API', action: runOpenAI });
        strategies.push({ name: 'Local Transformers', action: runLocalTransformers });
        strategies.push({ name: 'Gemini API', action: runGemini });
        strategies.push({ name: 'Ollama API', action: runOllama });
    } else if (provider === 'ollama') {
        strategies.push({ name: 'Ollama API', action: runOllama });
        strategies.push({ name: 'Local Transformers', action: runLocalTransformers });
        strategies.push({ name: 'Gemini API', action: runGemini });
        strategies.push({ name: 'OpenAI API', action: runOpenAI });
    } else {
        // Preferred Local
        strategies.push({ name: 'Local Transformers', action: runLocalTransformers });
        if (geminiKey) strategies.push({ name: 'Gemini API', action: runGemini });
        if (openAiKey) strategies.push({ name: 'OpenAI API', action: runOpenAI });
        strategies.push({ name: 'Ollama API', action: runOllama });
    }

    // Always append the Zero-Dependency local hash fallback as the ultimate safety net
    strategies.push({ name: 'Zero-Dependency Local Hash Fallback', action: runDeterministicHashFallback });

    let lastError: any = null;
    for (const strategy of strategies) {
        try {
            const embeddings = await strategy.action();
            // Conforms each dimension structure precisely to 384 elements
            return embeddings.map(vector => {
                let v = Array.from(vector);
                if (v.length < 384) {
                    while (v.length < 384) v.push(0);
                } else if (v.length > 384) {
                    v = v.slice(0, 384);
                }
                return v;
            });
        } catch (err: any) {
            console.warn(`[VECTORS] Strategy "${strategy.name}" failed to generate embeddings:`, err.message || err);
            lastError = err;
        }
    }

    throw new Error(`[VECTORS] All embedding strategies failed. Last error: ${lastError?.message || lastError}`);
}

router.post('/embed', async (req, res) => {
    try {
        const { texts } = req.body;
        if (!texts || !Array.isArray(texts)) {
            throw new Error("Invalid input: 'texts' must be an array of strings.");
        }
        console.log(`[VECTORS] Embedding ${texts.length} texts...`);
        const embeddings = await generateEmbeddingsForTexts(texts);
        res.json(embeddings);
    } catch (error: unknown) {
        console.error("Embedding Error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown embedding error" });
    }
});

router.post('/add', async (req, res) => {
    try {
        const { projectId, tableName, data } = req.body;
        console.log(`[VECTORS] Adding ${data?.length} vectors to ${tableName} for project ${projectId}...`);
        await dbService.addVectors(projectId, tableName, data);
        res.json({ success: true });
    } catch (error: unknown) {
        console.error("Add Vectors Error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
});

router.post('/query', async (req, res) => {
    try {
        const { projectId, tableName, vector, limit } = req.body;
        console.log(`[VECTORS] Querying ${tableName} for project ${projectId} (limit: ${limit})...`);
        const results = await dbService.queryVectors(projectId, tableName, vector, limit);
        res.json(results);
    } catch (error: unknown) {
        console.error("Query Vectors Error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
});

router.post('/ingest-file', upload.single('file'), async (req, res) => {
    try {
        const { projectId } = req.body;
        if (!req.file) throw new Error("No file uploaded");

        const text = await parseFileBuffer(req.file.buffer, req.file.mimetype);
        if (!text || text.trim().length === 0) {
            throw new Error("Konnte keinen Text aus der Datei extrahieren. Handelt es sich um ein Bild oder ein leeres Dokument?");
        }

        const finalChunks = chunkText(text);
        
        if (finalChunks.length === 0) {
            throw new Error("Die Datei enthält nicht genügend Text zum Verarbeiten.");
        }

        const chunkTexts = finalChunks.map(item => item.text);
        const embeddings = await generateEmbeddingsForTexts(chunkTexts);

        const dataToInsert = finalChunks.map((item, index) => {
            return {
                id: `${projectId}_${Date.now()}_${index}`,
                vector: embeddings[index],
                text: item.text,
                title: req.file?.originalname || "Uploaded File",
                metadata: JSON.stringify({ 
                    projectId, 
                    timestamp: new Date().toISOString(),
                    sectionId: item.sectionId,
                    source: 'file-upload'
                })
            };
        });

        await dbService.addVectors(projectId, 'documents', dataToInsert as Record<string, unknown>[]);
        res.json({ success: true, chunks: finalChunks.length });
    } catch (error: unknown) {
        console.error("Ingestion Error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown ingestion error" });
    }
});

router.delete('/delete-document', async (req, res) => {
    try {
        const { projectId, title } = req.body;
        if (!projectId || !title) throw new Error("Missing projectId or title");
        
        const db = await dbService.getVectorDb(projectId);
        const table = await db.openTable('documents');
        const escapedTitle = (title as string).replace(/"/g, '\\"');
        await table.delete(`title = "${escapedTitle}"`);
        res.json({ success: true });
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown deletion error" });
    }
});

router.get('/documents', async (req, res) => {
    try {
        const { projectId } = req.query;
        const db = await dbService.getVectorDb(projectId as string);
        try {
            const table = await db.openTable('documents');
            const all = await table.query().limit(1000).toArray();
            const uniqueDocs = Array.from(new Set(all.map(d => d.title))).map(title => {
                const first = all.find(d => d.title === title);
                return { title, timestamp: first?.metadata ? JSON.parse(first.metadata).timestamp : null };
            });
            res.json(uniqueDocs);
        } catch (e: unknown) {
            res.json([]); 
        }
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
});

router.get('/document-content', async (req, res) => {
    try {
        const { projectId, title } = req.query;
        if (!projectId || !title) throw new Error("Missing projectId or title");

        const db = await dbService.getVectorDb(projectId as string);
        const table = await db.openTable('documents');
        const escapedTitle = (title as string).replace(/"/g, '\\"');
        
        // Fetch all chunks for this document
        const all = await table.query().where(`title = "${escapedTitle}"`).toArray();
        
        // Sort by the index at the end of the ID to maintain order
        const sorted = all.sort((a, b) => {
            const partsA = (a.id as string).split('_');
            const partsB = (b.id as string).split('_');
            const idxA = parseInt(partsA[partsA.length - 1] || '0');
            const idxB = parseInt(partsB[partsB.length - 1] || '0');
            return idxA - idxB;
        });

        const text = sorted.map(d => d.text).join('\n\n');
        res.json({ text, title: title as string });
    } catch (error: unknown) {
        console.error("Error retrieving document content:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
});

router.post('/parse-file', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("No file uploaded");
        const text = await parseFileBuffer(req.file.buffer, req.file.mimetype);
        res.json({ text, title: req.file.originalname });
    } catch (error: unknown) {
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
});

export default router;
