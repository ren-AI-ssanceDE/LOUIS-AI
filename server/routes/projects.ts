import { Router } from 'express';
import { dbService } from '../../services/dbService.ts';

const router = Router();

router.get('/projects', async (_req, res) => {
    try {
        const projects = await dbService.getProjects();
        res.json(projects);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Error [projects]:', error);
        res.status(500).json({ error: message, stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined });
    }
});

router.get('/project/:id', async (req, res) => {
    try {
        const data = await dbService.loadProjectData(req.params.id);
        res.json(data);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`API Error [loadProject ${req.params.id}]:`, error);
        res.status(500).json({ error: message, stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined });
    }
});

router.post('/project/:id', async (req, res) => {
    try {
        const { project_name, data, raw_content, metadata } = req.body;
        // Accept both current name and project_name for compatibility
        const finalName = project_name || req.body.name;
        await dbService.registerProject(req.params.id, finalName, metadata);
        await dbService.saveProjectData(req.params.id, data, raw_content, metadata);
        res.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`API Error [saveProject ${req.params.id}]:`, error);
        res.status(500).json({ error: message, stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined });
    }
});

router.delete('/project/:id', async (req, res) => {
    try {
        await dbService.deleteProject(req.params.id);
        res.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

router.get('/global-settings', async (req, res) => {
    try {
        const settings = await dbService.getGlobalSetting(req.query.setting_key as string);
        res.json(settings);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

router.post('/global-settings', async (req, res) => {
    try {
        await dbService.setGlobalSetting(req.body.setting_key, req.body.value);
        res.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

router.post('/save-history', async (req, res) => {
    try {
        await dbService.setGlobalSetting('saveHistory', req.body.history);
        res.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

router.get('/save-history', async (_req, res) => {
    try {
        const history = await dbService.getGlobalSetting('saveHistory');
        res.json(history || []);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
    }
});

export default router;
