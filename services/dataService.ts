/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import axios from 'axios';
import { createInitialAppState, getInitialProjectsForLevel, validateAndSanitizeFinancialData } from '../data.ts';
import type { AppState, Project, SaveHistoryEntry } from '../types.ts';
import { roundNumbers } from '../utils.ts';

// --- Axios Security Interceptor ---
// Note: VITE_PROJECT_TOKEN must be set in environment for the client to authenticate with the server.
const token = import.meta.env.VITE_PROJECT_TOKEN;
if (token) {
    axios.interceptors.request.use(config => {
        config.headers['X-Project-Token'] = token;
        return config;
    });
}

const API_BASE = '/api';

// --- Improved Data Service with Backend Support ---

export const saveAppState = async (appState: AppState): Promise<void> => {
    try {
        const roundedState = roundNumbers(appState);
        // Save global settings
        await axios.post(`${API_BASE}/global-settings`, { setting_key: 'aiSettings', value: roundedState.aiSettings });
        await axios.post(`${API_BASE}/global-settings`, { setting_key: 'customAiPrompts', value: roundedState.customAiPrompts });
        await axios.post(`${API_BASE}/global-settings`, { setting_key: 'activeProjectId', value: roundedState.activeProjectId });

        // Save projects individually to their own SQLite databases
        for (const project of roundedState.projects) {
            await axios.post(`${API_BASE}/project/${project.id}`, {
                project_name: project.projectName, // Semantic nomenclature
                data: project.data,
                raw_content: (project as any).rawContent,
                metadata: project.metadata
            });
        }
    } catch (error) {
        console.error("Error saving state to backend:", error);
    }
};

export const deleteProject = async (projectId: string): Promise<void> => {
    try {
        await axios.delete(`${API_BASE}/project/${projectId}`);
    } catch (error) {
        console.error("Error deleting project from backend:", error);
    }
};

interface ProjectMeta {
    project_id: string; // Semantic
    project_name: string; // Semantic
    project_status?: string; // Semantic
    created_at?: string;
    updated_at?: string;
    metadata?: string;
}

export const loadAppState = async (): Promise<AppState> => {
    try {
        // 1. Try to load from Backend (SQLite)
        const projectsMetaResponse = await axios.get<ProjectMeta[]>(`${API_BASE}/projects`);
        const projectsMeta = projectsMetaResponse.data;

        if (projectsMeta && Array.isArray(projectsMeta) && projectsMeta.length > 0) {
            console.log("Loading state from SQLite backend.");
            const projects: Project[] = await Promise.all(
                projectsMeta.map(async (meta: ProjectMeta) => {
                    const projectDataResponse = await axios.get(`${API_BASE}/project/${meta.project_id}`);
                    const rawData = projectDataResponse.data;
                    const validated = validateAndSanitizeFinancialData(rawData);
                    return {
                        id: meta.project_id,
                        projectName: meta.project_name,
                        projectStatus: meta.project_status || 'active',
                        createdAt: meta.created_at || new Date().toISOString(),
                        updatedAt: meta.updated_at || new Date().toISOString(),
                        metadata: meta.metadata ? JSON.parse(meta.metadata) : {},
                        data: validated.isValid ? validated.data! : rawData
                    };
                })
            );

            // Filter out projects that failed to load data
            const validProjects = projects.filter(p => p.data !== null && p.data !== undefined);
            
            // Ensure basis projects are included (reconnect with lost data if ID matches)
            const basisProjects = getInitialProjectsForLevel();
            const mergedProjects = [...validProjects];
            const loadedIds = new Set(validProjects.map(p => p.id));
            
            for (const bp of basisProjects) {
                if (!loadedIds.has(bp.id)) {
                    console.log(`[DataService] Merging missing basis project: ${bp.projectName} (${bp.id})`);
                    mergedProjects.push(bp);
                }
            }

            if (mergedProjects.length === 0) {
                console.warn("No projects could be validly loaded from backend/defaults. Falling back to initial state.");
                return fallbackToInitialState();
            }

            const aiSettings = (await axios.get(`${API_BASE}/global-settings?setting_key=aiSettings`)).data;
            const customAiPrompts = (await axios.get(`${API_BASE}/global-settings?setting_key=customAiPrompts`)).data;
            const activeProjectId = (await axios.get(`${API_BASE}/global-settings?setting_key=activeProjectId`)).data;

            return {
                projects: mergedProjects,
                activeProjectId: activeProjectId || (mergedProjects.length > 0 ? mergedProjects[0].id : null),
                aiSettings: aiSettings || undefined,
                customAiPrompts: customAiPrompts || undefined
            };
        }
    } catch (error) {
        console.error("Error loading from backend:", error);
    }

    return fallbackToInitialState();
};

export const fallbackToInitialState = async (): Promise<AppState> => {
    // 2. Initial State fallback
    console.log("Creating initial state.");
    const premadeProjects = getInitialProjectsForLevel();
    const initialAppState: AppState = {
        ...createInitialAppState(),
        projects: premadeProjects,
        activeProjectId: premadeProjects.length > 0 ? premadeProjects[0].id : null,
    };
    
    // Save initial state to backend immediately
    try {
        await saveAppState(initialAppState);
    } catch (e) {
        console.error("Failed to save initial state", e);
    }
    
    return initialAppState;
};


export const loadStaticData = async <T>(fileName: string, dataUrlBase: string): Promise<T> => {
    const response = await fetch(`${dataUrlBase}${fileName}`);
    if (!response.ok) {
        throw new Error(`Network response was not ok for ${fileName}`);
    }
    return response.json() as Promise<T>;
};

export const exportAllData = (appState: AppState) => {
    try {
        const dataStr = JSON.stringify(appState, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.download = `louis_ai_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export all failed:", error);
    }
};

export const exportSingleProject = (project: Project) => {
    try {
        const dataStr = JSON.stringify(project, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.download = `louis_ai_${project.projectName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export single failed:", error);
    }
};

export const saveHistoryToDb = async (history: SaveHistoryEntry[]): Promise<void> => {
    try {
        await axios.post(`${API_BASE}/save-history`, { history });
    } catch (e) {
        console.error("Error saving history:", e);
    }
};

export const loadHistoryFromDb = async (): Promise<SaveHistoryEntry[]> => {
    try {
        const response = await axios.get(`${API_BASE}/save-history`);
        return response.data || [];
    } catch (e) {
        console.error("Error loading history:", e);
        return [];
    }
};
