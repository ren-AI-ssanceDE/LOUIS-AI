import { Request, Response, NextFunction } from 'express';

export function projectTokenAuth(req: Request, res: Response, next: NextFunction) {
    const projectToken = process.env.VITE_PROJECT_TOKEN || process.env.PROJECT_TOKEN;
    
    if (projectToken) {
        const token = req.headers['x-project-token'];
        if (token !== projectToken) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Project-Token' });
        }
    }
    next();
}
