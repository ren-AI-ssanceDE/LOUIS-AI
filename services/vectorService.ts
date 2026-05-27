import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface KnowledgeResult {
    title: string;
    text: string;
    score?: number;
}

export const vectorService = {
    /**
     * Zerteilt einen Text in Chunks (Stücke) - Lokal
     */
    chunkText(text: string, maxChars: number = 800): string[] {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const chunks: string[] = [];
        let currentChunk = "";

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > maxChars) {
                if (currentChunk) chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += sentence;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    },

    /**
     * Ruft Embeddings vom lokalen Backend ab
     */
    async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const response = await axios.post('/api/vectors/embed', { texts });
        return response.data;
    },

    /**
     * Lädt eine Datei hoch und verarbeitet sie im Backend
     */
    async uploadFile(projectId: string, file: File): Promise<{ success: boolean; chunks: number }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);

        const response = await axios.post('/api/vectors/ingest-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Listet alle Dokumente eines Projekts auf
     */
    async getDocuments(projectId: string): Promise<{ title: string; timestamp: string }[]> {
        const response = await axios.get('/api/vectors/documents', { params: { projectId } });
        return response.data;
    },

    /**
     * Löscht ein Dokument aus der Vektordatenbank
     */
    async deleteDocument(projectId: string, title: string): Promise<void> {
        await axios.delete('/api/vectors/delete-document', { data: { projectId, title } });
    },

    /**
     * Liest den Text einer Datei aus, OHNE ihn zu bewerten/speichern
     */
    async parseFile(file: File): Promise<{ text: string; title: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post('/api/vectors/parse-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    /**
     * Verarbeitet ein Dokument und speichert es lokal
     */
    async ingestDocument(projectId: string, title: string, content: string) {
        const chunks = this.chunkText(content);
        const embeddings = await this.generateEmbeddings(chunks);

        const dataToInsert = chunks.map((text, index) => ({
            id: uuidv4(),
            vector: embeddings[index],
            text: text,
            title: title,
            metadata: JSON.stringify({ projectId, timestamp: new Date().toISOString() })
        }));

        await axios.post('/api/vectors/add', {
            projectId,
            tableName: 'documents',
            data: dataToInsert
        });

        console.log(`[LOKAL] Ingested ${chunks.length} chunks for document: ${title}`);
    },

    /**
     * Sucht nach relevanten Inhalten in der lokalen Vectordatenbank
     */
    async searchContext(projectId: string, query: string, limit: number = 10): Promise<KnowledgeResult[]> {
        const queryEmbeddings = await this.generateEmbeddings([query]);
        if (!queryEmbeddings || queryEmbeddings.length === 0) return [];
        const queryVector = queryEmbeddings[0];

        const response = await axios.post('/api/vectors/query', {
            projectId,
            tableName: 'documents',
            vector: queryVector,
            limit
        });

        return response.data as KnowledgeResult[];
    }
};
