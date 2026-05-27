/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';
import axios from 'axios';
import i18n from '../i18n.ts';
import * as dataService from '../services/dataService.ts';
import { calculateFinancials } from '../services/calculationService.ts';
import { roundNumbers, deepClone } from '../utils.ts';
import { createDefaultFinancialData, validateAndSanitizeFinancialData, resizeYearlyData, createInitialAppState } from '../data.ts';
import type { AppState, FinancialData, Project, ViewType, AiSettings, AiPersona, ModalInfo, SaveHistoryEntry, CustomAiPrompt, CalculationResults } from '../types.ts';

interface StoreState {
    isInitialized: boolean;
    appState: AppState;
    theme: string;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    saveHistory: SaveHistoryEntry[];
    afaData: { name: string; life: number }[];
    personas: AiPersona[];
    aiSettings: AiSettings;
    customAiPrompts: CustomAiPrompt[];
    view: ViewType;
    modalInfo: ModalInfo | null;
    notification: { message: string; id: number; class?: string } | null;
    calculations: CalculationResults | null;
    
    initialize: (dataUrlBase: string) => Promise<void>;
    setTheme: (theme: string) => void;
    saveData: (stateToSave: AppState, savePointLimit: number) => Promise<void>;
    updateCurrentProjectData: (dataUpdate: Partial<FinancialData>) => void;
    setView: (view: ViewType) => void;
    setModalInfo: (info: ModalInfo | null) => void;
    setNotification: (notification: { message: string; id: number; class?: string } | null) => void;
    setAiSettings: (settings: AiSettings) => void;
    setCustomAiPrompts: (prompts: CustomAiPrompt[]) => void;
    
    handleSelectProject: (projectId: string) => void;
    handleNewProject: () => void;
    handleDeleteRequest: () => void;
    executeSwitchProject: (projectId: string) => void;
    executeNewProject: () => void;
    executeDeleteProject: (projectId: string) => void;
    executeNewProjectFromData: (data: FinancialData) => void;
    executeResetProject: () => void;
    
    handleImport: (file: File) => void;
    handleImportAsCopy: (project: Project) => void;
    handleImportOverwrite: (existing: Project, newProject: Project) => void;
    
    executeRestore: (entry: SaveHistoryEntry) => void;
    
    getActiveProject: () => Project | undefined;
}

export const useStore = create<StoreState>((set, get) => ({
    isInitialized: false,
    appState: { projects: [], activeProjectId: null },
    theme: 'light',
    saveStatus: 'saved',
    saveHistory: [],
    afaData: [],
    personas: [],
    aiSettings: createInitialAppState().aiSettings!,
    customAiPrompts: createInitialAppState().customAiPrompts!,
    view: 'basicSettings',
    modalInfo: null,
    notification: null,
    calculations: null,
    
    initialize: async (dataUrlBase: string) => {
        const [appState, themeResponse, afaData, personas, saveHistory] = await Promise.all([
            dataService.loadAppState(),
            axios.get('/api/global-settings?setting_key=theme').then(r => r.data || 'light'),
            dataService.loadStaticData<{ name: string; life: number }[]>('afa-data.json', dataUrlBase),
            dataService.loadStaticData<AiPersona[]>('personas.json', dataUrlBase),
            dataService.loadHistoryFromDb(),
        ]);
        
        const theme = typeof themeResponse === 'string' ? themeResponse : 'light';
        
        const activeProject = appState.projects.find((p: Project) => p.id === appState.activeProjectId);
        set({
            appState,
            theme,
            afaData,
            personas,
            saveHistory,
            aiSettings: appState.aiSettings || createInitialAppState().aiSettings!,
            customAiPrompts: appState.customAiPrompts || createInitialAppState().customAiPrompts!,
            calculations: calculateFinancials(activeProject?.data || null),
            isInitialized: true
        });
    },

    setTheme: (theme: string) => {
        set({ theme });
        axios.post('/api/global-settings', { setting_key: 'theme', value: theme }).catch(e => console.error("Failed to save theme", e));
    },

    saveData: async (stateToSave: AppState, savePointLimit: number) => {
        if (get().saveStatus === 'saving') return;
        set({ saveStatus: 'saving' });
        
        const currentAppStateSnapshot = deepClone(stateToSave);
        const newHistoryEntry: SaveHistoryEntry = {
            timestamp: new Date().toISOString(),
            appStateSnapshot: currentAppStateSnapshot
        };
        const newHistory = [newHistoryEntry, ...get().saveHistory].slice(0, savePointLimit);

        await Promise.all([
            dataService.saveAppState(currentAppStateSnapshot),
            dataService.saveHistoryToDb(newHistory)
        ]);
        
        set({ saveStatus: 'saved', saveHistory: newHistory, notification: { message: i18n.t('common.saved'), id: Date.now() } });
    },

    updateCurrentProjectData: (dataUpdate: Partial<FinancialData>) => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return;

        // Round all numbers in incoming data update
        const roundedUpdate = roundNumbers(dataUpdate);

        let currentData = activeProject.data;
        const newYears = roundedUpdate.settings?.planningYears;

        // If planning years change, resize all year-dependent arrays first.
        if (newYears !== undefined && newYears !== currentData.settings.planningYears) {
            currentData = resizeYearlyData(currentData, newYears);
        }
        
        // Merge the incoming update with the (potentially resized) current data.
        const updatedData: FinancialData = {
            ...currentData,
            ...roundedUpdate,
            // Deep merge settings to ensure other settings aren't lost if only years changed
            settings: {
                ...currentData.settings,
                ...roundedUpdate.settings,
            },
        };
        
        const updatedProject = {
            ...activeProject,
            data: updatedData,
            projectName: updatedData.settings.title, // Sync project name with settings title
            updatedAt: new Date().toISOString(),
        };
        
        const newProjects = get().appState.projects.map((p: Project) => p.id === updatedProject.id ? updatedProject : p);
        const newAppState = { ...get().appState, projects: newProjects };

        set({
            appState: newAppState,
            saveStatus: 'unsaved',
            calculations: calculateFinancials(updatedData)
        });
    },

    setView: (view: ViewType) => set({ view }),
    setModalInfo: (info: ModalInfo | null) => set({ modalInfo: info }),
    setNotification: (notification) => set({ notification }),
    setAiSettings: (settings: AiSettings) => {
        const newAppState = { ...get().appState, aiSettings: settings };
        set({
            appState: newAppState,
            aiSettings: settings,
            saveStatus: 'unsaved'
        });
    },
    setCustomAiPrompts: (prompts: CustomAiPrompt[]) => {
        const newAppState = { ...get().appState, customAiPrompts: prompts };
        set({
            appState: newAppState,
            customAiPrompts: prompts,
            saveStatus: 'unsaved'
        });
    },
    
    getActiveProject: () => get().appState.projects.find((p: Project) => p.id === get().appState.activeProjectId),

    handleSelectProject: (projectId: string) => {
        if (get().saveStatus === 'unsaved') {
            set({ modalInfo: { type: 'confirmSwitchProject', projectId } });
        } else {
            get().executeSwitchProject(projectId);
        }
    },

    executeSwitchProject: (projectId: string) => {
        const newAppState = { ...get().appState, activeProjectId: projectId };
        const activeProject = newAppState.projects.find((p: Project) => p.id === projectId);
        set({
            appState: newAppState,
            view: 'basicSettings',
            modalInfo: null,
            calculations: calculateFinancials(activeProject?.data || null),
        });
    },

    handleNewProject: () => {
         // This logic is now in App.tsx to access permissions context
         console.warn("handleNewProject should be called from App.tsx context-aware handler");
    },

    executeNewProject: () => {
        const newId = uuidv4();
        const defaultData = createDefaultFinancialData();
        const dateStr = new Date().toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US');
        const projectTitle = `${i18n.t('app.new_project')} ${dateStr}`;
        defaultData.settings.title = projectTitle;
        const newProject: Project = { 
            id: newId, 
            projectName: projectTitle, 
            projectStatus: 'active',
            data: defaultData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const newAppState = {
            ...get().appState,
            projects: [...get().appState.projects, newProject],
            activeProjectId: newId
        };
        set({ appState: newAppState, view: 'basicSettings', modalInfo: null, calculations: calculateFinancials(newProject.data), saveStatus: 'unsaved' });
    },

    executeNewProjectFromData: (data: FinancialData) => {
        const newId = uuidv4();
        const roundedData = roundNumbers(data);
        const validated = validateAndSanitizeFinancialData(roundedData);
        if (!validated.isValid || !validated.data) {
            console.error("AI returned invalid data for new project:", validated.error);
            get().executeNewProject();
            get().setNotification({ message: i18n.t('app.error_boundary_title'), id: Date.now() });
            return;
        }
        const projectData = validated.data;
        const dateStr = new Date().toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'en-US');
        const newProject: Project = { 
            id: newId, 
            projectName: projectData.settings.title || `${i18n.t('app.new_project')} ${dateStr}`, 
            projectStatus: 'active',
            data: projectData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const newAppState = {
            ...get().appState,
            projects: [...get().appState.projects, newProject],
            activeProjectId: newId
        };
        set({ 
            appState: newAppState, 
            view: 'basicSettings', 
            modalInfo: null, 
            calculations: calculateFinancials(newProject.data), 
            saveStatus: 'unsaved',
            notification: { message: i18n.t('modals.import_confirm.title'), id: Date.now() }
        });
    },

    executeResetProject: () => {
        const activeProject = get().getActiveProject();
        if (!activeProject) return;

        const defaultData = createDefaultFinancialData();
        // Preserve the original project's name/title and other key settings
        defaultData.settings.title = activeProject.data.settings.title;
        
        const updatedProject: Project = {
            ...activeProject,
            projectName: activeProject.data.settings.title, // Ensure project name and setting title are in sync
            data: defaultData,
            updatedAt: new Date().toISOString(),
        };

        const newProjects = get().appState.projects.map((p: Project) =>
             p.id === activeProject.id ? updatedProject : p
         );
        const newAppState = { ...get().appState, projects: newProjects };

        set({
            appState: newAppState,
            saveStatus: 'unsaved',
            modalInfo: null,
            calculations: calculateFinancials(updatedProject.data),
            notification: { message: i18n.t('common.reset'), id: Date.now() },
        });
    },

    handleDeleteRequest: () => {
        if (get().appState.projects.length <= 1) {
            set({ modalInfo: { type: 'cannotDeleteLastProject' } });
        } else {
            set({ modalInfo: { type: 'deleteProject' } });
        }
    },

    executeDeleteProject: async (projectId: string) => {
        const newProjects = get().appState.projects.filter((p: Project) => p.id !== projectId);
        const newActiveProjectId = newProjects[0]?.id || null;
        const newAppState = { projects: newProjects, activeProjectId: newActiveProjectId };
        const activeProject = newProjects.find((p: Project) => p.id === newActiveProjectId);
        
        // Sync with backend
        await dataService.deleteProject(projectId);
        await dataService.saveAppState({ ...get().appState, ...newAppState });

        set({
            appState: { ...get().appState, ...newAppState },
            modalInfo: null,
            calculations: calculateFinancials(activeProject?.data || null),
            saveStatus: 'saved'
        });
    },
    
    handleImport: (file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                
                // It could be a full AppState backup or a single project
                const isFullBackup = imported.hasOwnProperty('projects') && imported.hasOwnProperty('activeProjectId');
                const projectToImport = (isFullBackup && Array.isArray(imported.projects) && imported.projects.length > 0) ? imported.projects[0] : imported;

                if (!projectToImport || !projectToImport.id || !(projectToImport.projectName || projectToImport.name) || !projectToImport.data) {
                    throw new Error("Invalid project file format.");
                }

                const existingProject = get().appState.projects.find((p: Project) => p.projectName.toLowerCase() === (projectToImport.projectName || projectToImport.name).toLowerCase());

                if (existingProject) {
                    set({ modalInfo: { type: 'importConflict', newProject: projectToImport, existingProject } });
                } else {
                    set({ modalInfo: { type: 'confirmNewProjectImport', newProject: projectToImport } });
                }

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                set({ modalInfo: { type: 'error', title: i18n.t('modals.import_confirm.title'), message: `${i18n.t('modals.import_confirm.title')} ${errorMessage}` } });
            }
        };
        reader.readAsText(file);
    },

    handleImportAsCopy: (projectToImport: Project) => {
        const sanitizedResult = validateAndSanitizeFinancialData(projectToImport.data);
        if (!sanitizedResult.isValid || !sanitizedResult.data) {
             set({ modalInfo: { type: 'error', title: i18n.t('modals.import_confirm.title'), message: `${i18n.t('modals.import_confirm.title')} ${sanitizedResult.error}` } });
             return;
        }

        const newProject: Project = {
            ...projectToImport,
            data: sanitizedResult.data,
            id: uuidv4(),
            projectName: `${projectToImport.projectName || (projectToImport as any).name} (${i18n.t('common.copy', { defaultValue: 'Copy' })})`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const newAppState = { ...get().appState, projects: [...get().appState.projects, newProject] };
        set({ appState: newAppState, modalInfo: null, saveStatus: 'unsaved', notification: { message: i18n.t('modals.import_confirm.title'), id: Date.now() } });
    },
    
    handleImportOverwrite: (existing: Project, newProject: Project) => {
        const sanitizedResult = validateAndSanitizeFinancialData(newProject.data);
        if (!sanitizedResult.isValid || !sanitizedResult.data) {
             set({ modalInfo: { type: 'error', title: i18n.t('modals.import_confirm.title'), message: `${i18n.t('modals.import_confirm.title')} ${sanitizedResult.error}` } });
             return;
        }
        
        const updatedProject = { 
            ...existing, 
            data: sanitizedResult.data,
            updatedAt: new Date().toISOString() 
        };
        const newProjects = get().appState.projects.map((p: Project) => p.id === existing.id ? updatedProject : p);
        const newAppState = { ...get().appState, projects: newProjects };
        set({ appState: newAppState, modalInfo: null, saveStatus: 'unsaved', notification: { message: i18n.t('modals.overwrite_confirm.title'), id: Date.now() } });
    },

    executeRestore: (entry: SaveHistoryEntry) => {
        const restoredState = deepClone(entry.appStateSnapshot);
        const activeProject = restoredState.projects.find((p: Project) => p.id === restoredState.activeProjectId);
        set({
            appState: restoredState,
            aiSettings: restoredState.aiSettings || createInitialAppState().aiSettings!,
            customAiPrompts: restoredState.customAiPrompts || createInitialAppState().customAiPrompts!,
            saveStatus: 'unsaved',
            modalInfo: null,
            notification: { message: i18n.t('modals.restore.title'), id: Date.now() },
            calculations: calculateFinancials(activeProject?.data || null)
        });
    }

}));