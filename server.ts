import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { dbService } from './services/dbService.ts';
import apiRoutes from './server/routes/index.ts';
import { projectTokenAuth } from './server/middleware/auth.ts';

/**
 * Main server entry point.
 * Refactored to use modular routes and utilities.
 */
async function startServer() {
    console.log('--- SERVER INITIALIZING ---');
    const app = express();
    const PORT = 3000; 

    // Standard middleware
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // 1. Health check (stays here for monitoring convenience)
    app.get('/api/health', async (_req, res) => {
        let dbStatus = 'unknown';
        try {
            await dbService.getProjects();
            dbStatus = 'connected';
        } catch (err: unknown) {
            dbStatus = `error: ${err instanceof Error ? err.message : String(err)}`;
        }
        res.json({ 
            status: 'ok', 
            dbStatus,
            timestamp: new Date().toISOString() 
        });
    });

    // 2. Initialize Database
    console.log('Initializing database...');
    try {
        await dbService.initialize();
        console.log('Database initialized.');
    } catch (dbErr) {
        console.error('Database initialization failed:', dbErr);
    }

    // 3. Security & Auth Middleware
    app.use('/api', projectTokenAuth);

    // 4. API Routes (Modularized)
    app.use('/api', apiRoutes);

    // 5. Frontend (Vite in Dev, Static in Prod)
    if (process.env.NODE_ENV !== 'production') {
        console.log('Mode: DEVELOPMENT (Vite Enabled)');
        try {
            const vite = await createViteServer({
                server: { middlewareMode: true },
                appType: 'spa',
            });
            app.use(vite.middlewares);
        } catch (viteErr) {
            console.error('Vite Server Creation Failed:', viteErr);
        }
    } else {
        console.log('Mode: PRODUCTION');
        const distPath = path.join(process.cwd(), 'dist');
        if (fs.existsSync(distPath)) {
            app.use(express.static(distPath));
            app.get('*', (req: Request, res: Response) => {
                // Ensure we don't serve index.html for API requests or missing static assets
                if (req.path.startsWith('/api/') || req.path.includes('.')) {
                    return res.status(404).json({ error: 'Not Found' });
                }
                res.sendFile(path.join(distPath, 'index.html'));
            });
        }
    }

    // 6. Start listening
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`--- SERVER LISTENING ON http://0.0.0.0:${PORT} ---`);
    });
}

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason, promise);
});

// Run server
startServer().catch(err => {
    console.error('CRITICAL: startServer failed:', err);
});
