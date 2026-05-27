/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback, Component, ReactNode } from 'react';

import i18next from 'i18next';

// Error Boundary for better stability
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("React Error Boundary caught an error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', background: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <h2 style={{ color: '#d32f2f', marginBottom: '16px' }}>{i18next.t('app.error_boundary_title')}</h2>
                    <p style={{ marginBottom: '24px', color: '#666' }}>{i18next.t('app.error_boundary_text')}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        style={{ padding: '10px 24px', cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600 }}
                    >
                        {i18next.t('app.reload_app')}
                    </button>
                    <details style={{ marginTop: '32px', textAlign: 'left', opacity: 0.7, maxWidth: '600px' }}>
                        <summary style={{ cursor: 'pointer', color: '#2563eb' }}>{i18next.t('app.show_details')}</summary>
                        <pre style={{ fontSize: '12px', marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '4px', overflow: 'auto' }}>{this.state.error?.toString()}</pre>
                    </details>
                </div>
            );
        }
        return this.props.children;
    }
}

import { useStore } from './store/index.ts';
import * as dataService from './services/dataService.ts';
import { useTranslation } from 'react-i18next';

import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/views.css';
import './styles/ai_assistant.css';
import './styles/charts.css';
import './styles/print.css';

import { Icon } from './components/Icon.tsx';
import { Uebersicht } from './views/Uebersicht.tsx';
import { Grundeinstellungen } from './views/Grundeinstellungen.tsx';
import { Privatbedarfsplan } from './views/Privatbedarfsplan.tsx';
import { Finanzierungsplan } from './views/Finanzierungsplan.tsx';
import { ProduktPreiskalkulation } from './views/ProduktPreiskalkulation.tsx';
import { Absatzplan } from './views/Absatzplan.tsx';
import { Ertragsplan } from './views/Ertragsplan.tsx';
import { Liquiditaetsplan } from './views/Liquiditaetsplan.tsx';
import { Abschreibungsplan } from './views/Abschreibungsplan.tsx';
import { Einstellungen } from './views/Einstellungen.tsx';
import { AiAssistant } from './components/AiAssistant.tsx';
import { PrintContainer } from './components/PrintComponents.tsx';
import { AppModals } from './components/AppModals.tsx';
import { DebugPanel } from './components/DebugPanel.tsx';
import type { 
    ViewType, FinancialData, CompanySettings, PrivateNeed, FinancingItem, 
    StartupCosts, OpCostCategoryKey, OpCostCategory, Asset, SaveHistoryEntry, Project 
} from './types.ts';
import type { AppConfig } from './config.ts';

// --- MAIN APP COMPONENT ---

interface AppProps {
    config: AppConfig;
}

const AppContent = ({ config }: AppProps) => {
    const { t } = useTranslation();
    const isInitialized = useStore(state => state.isInitialized);
    const activeProjectId = useStore(state => state.appState.activeProjectId);
    const projects = useStore(state => state.appState.projects);
    const theme = useStore(state => state.theme);
    const saveStatus = useStore(state => state.saveStatus);
    const saveHistory = useStore(state => state.saveHistory);
    const afaData = useStore(state => state.afaData);
    const personas = useStore(state => state.personas);
    const aiSettings = useStore(state => state.aiSettings);
    const customAiPrompts = useStore(state => state.customAiPrompts);
    const view = useStore(state => state.view);
    const modalInfo = useStore(state => state.modalInfo);
    const notification = useStore(state => state.notification);

    const initialize = useStore(state => state.initialize);
    const setTheme = useStore(state => state.setTheme);
    const saveData = useStore(state => state.saveData);
    const handleSelectProject = useStore(state => state.handleSelectProject);
    const handleDeleteRequest = useStore(state => state.handleDeleteRequest);
    const executeDeleteProject = useStore(state => state.executeDeleteProject);
    const executeNewProject = useStore(state => state.executeNewProject);
    const executeSwitchProject = useStore(state => state.executeSwitchProject);
    const handleImport = useStore(state => state.handleImport);
    const handleImportAsCopy = useStore(state => state.handleImportAsCopy);
    const handleImportOverwrite = useStore(state => state.handleImportOverwrite);
    const executeRestore = useStore(state => state.executeRestore);
    const setView = useStore(state => state.setView);
    const setModalInfo = useStore(state => state.setModalInfo);
    const setNotification = useStore(state => state.setNotification);
    const updateCurrentProjectData = useStore(state => state.updateCurrentProjectData);
    const setAiSettings = useStore(state => state.setAiSettings);
    const setCustomAiPrompts = useStore(state => state.setCustomAiPrompts);
    const executeNewProjectFromData = useStore(state => state.executeNewProjectFromData);
    const executeResetProject = useStore(state => state.executeResetProject);
    const activeProject = useStore(state => state.getActiveProject());
    const calculations = useStore(state => state.calculations);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);

    const [plansToPrint, setPlansToPrint] = useState<Record<string, boolean>>({
        basicSettings: true,
        productPricing: true,
        salesPlan: true,
        privateDemand: true,
        financingPlan: true,
        earningsPlan: true,
        liquidityPlan: true,
        depreciationPlan: true,
        statsYearly: true,
        statsBanks: true,
        statsInvestors: true,
        statsGrantors: true,
        scenarioComparison: true,
    });
    
    const notificationTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const init = async () => {
            await initialize(config.dataUrlBase);
        };
        init();
         const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'true') {
            setIsDebugPanelVisible(true);
        }
    }, [initialize, config.dataUrlBase]);

    useEffect(() => {
        if (!isInitialized) return;
        const appRoot = document.getElementById('louis-ai-app');
        if (appRoot) appRoot.className = `${theme}-theme`;
    }, [theme, isInitialized]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveStatus === 'unsaved') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saveStatus]);

    useEffect(() => {
        if (notification && !notification.class) {
            if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
            notificationTimeoutRef.current = window.setTimeout(() => {
                setNotification({ ...notification, class: 'fade-out' });
                notificationTimeoutRef.current = window.setTimeout(() => setNotification(null), 300);
            }, 5000);
        }
        return () => { if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current); };
    }, [notification, setNotification]);
    
    const navLinks: { id: ViewType; label: string; icon: JSX.Element; }[] = useMemo(() => [
        { id: 'basicSettings', label: t('views.grundeinstellungen'), icon: <Icon icon="stammdaten" className="nav-icon" /> },
        { id: 'privateDemand', label: t('views.privatbedarf'), icon: <Icon icon="privatbedarf" className="nav-icon" /> },
        { id: 'financingPlan', label: t('views.finanzierungsplan'), icon: <Icon icon="finanzplan" className="nav-icon" /> },
        { id: 'depreciationPlan', label: t('views.abschreibungsplan'), icon: <Icon icon="afa" className="nav-icon" /> },
        { id: 'productPricing', label: t('views.produkt_preiskalkulation'), icon: <Icon icon="produkt" className="nav-icon" /> },
        { id: 'salesPlan', label: t('views.absatzplan'), icon: <Icon icon="absatzplan" className="nav-icon" /> },
        { id: 'earningsPlan', label: t('views.ertragsplan'), icon: <Icon icon="ertragsplan" className="nav-icon" /> },
        { id: 'liquidityPlan', label: t('views.liquiditaetsplan'), icon: <Icon icon="liquiditaet" className="nav-icon" /> },
        { id: 'overview', label: t('views.uebersicht'), icon: <Icon icon="uebersicht" className="nav-icon" /> },
    ], [t]);

    const handleDataChange = useCallback((newData: Partial<FinancialData>) => {
        if (updateCurrentProjectData) {
            updateCurrentProjectData(newData);
        }
    }, [updateCurrentProjectData]);
    
    const handleNewProject = () => {
        if (saveStatus === 'unsaved') {
            setModalInfo({ type: 'confirmNewProjectUnsaved' });
        } else {
            executeNewProject();
        }
    };
    
    const handleNewProjectFromData = (data: FinancialData) => {
        executeNewProjectFromData(data);
    };

    const handleSettingsChange = useCallback((newSettings: CompanySettings) => handleDataChange({ settings: newSettings }), [handleDataChange]);
    const handlePrivateNeedsChange = useCallback((newData: PrivateNeed[]) => handleDataChange({ privateNeeds: newData }), [handleDataChange]);
    const handleFinancingChange = useCallback((newData: FinancingItem[]) => handleDataChange({ financing: newData }), [handleDataChange]);
    const handleStartupCostsChange = useCallback((newData: StartupCosts) => handleDataChange({ startupCosts: newData }), [handleDataChange]);
    const handleSalesChange = useCallback((newData: Record<string, number[][]>) => handleDataChange({ sales: newData }), [handleDataChange]);
    const handleOpCostsChange = useCallback((newData: Record<OpCostCategoryKey, OpCostCategory>) => handleDataChange({ operationalCosts: newData }), [handleDataChange]);
    const handleAssetsChange = useCallback((newData: Asset[]) => handleDataChange({ assets: newData }), [handleDataChange]);
    
    const handleExportAll = useCallback(() => {
        const stateSnapshot = useStore.getState().appState;
        dataService.exportAllData(stateSnapshot);
    }, []);
    const handleExportSingle = useCallback(() => { if (activeProject) dataService.exportSingleProject(activeProject) }, [activeProject]);
    const handlePrintRequest = useCallback(() => setModalInfo({ type: 'print' }), [setModalInfo]);
    const handleSendEmailRequest = useCallback(() => setModalInfo({ type: 'sendEmail' }), [setModalInfo]);
    const handleRestore = useCallback((entry: SaveHistoryEntry) => setModalInfo({ type: 'confirmRestore', entry }), [setModalInfo]);
    const showErrorModal = useCallback((error: {title: string, message: string}) => setModalInfo({ type: 'error', ...error }), [setModalInfo]);
    const handleResetProjectRequest = useCallback(() => setModalInfo({ type: 'confirmResetProject' }), [setModalInfo]);

    const handleImportWrapper = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file) {
                handleImport(file);
            }
        }
    }, [handleImport]);
    
    const renderView = () => {
        if (!activeProject || !activeProject.data) return <div className="card"><h2>{t('app.no_project_selected')}</h2><p>{t('app.please_select_project')}</p></div>;
        if (!calculations) return <div className="card"><h2>{t('app.calculating')}</h2></div>;
        
        switch (view) {
            case 'overview': return <Uebersicht data={activeProject.data} calculations={calculations} />;
            case 'basicSettings': return <Grundeinstellungen settings={activeProject.data.settings} onSettingsChange={handleSettingsChange} onPrintRequest={handlePrintRequest} onSendEmailRequest={handleSendEmailRequest} onResetProjectRequest={handleResetProjectRequest} />;
            case 'privateDemand': return <Privatbedarfsplan privateNeeds={activeProject.data.privateNeeds} onPrivateNeedsChange={handlePrivateNeedsChange} settings={activeProject.data.settings} />;
            case 'financingPlan': return <Finanzierungsplan data={activeProject.data.financing} setData={handleFinancingChange} startupCosts={activeProject.data.startupCosts} setStartupCosts={handleStartupCostsChange} settings={activeProject.data.settings} />;
            case 'productPricing': return <ProduktPreiskalkulation products={activeProject.data.products} productCategories={activeProject.data.productCategories || []} onDataChange={handleDataChange} />;
            case 'salesPlan': return <Absatzplan products={activeProject.data.products} sales={activeProject.data.sales} setSales={handleSalesChange} settings={activeProject.data.settings} />;
            case 'earningsPlan': return <Ertragsplan data={activeProject.data} calculations={calculations} onOpCostsChange={handleOpCostsChange} />;
            case 'liquidityPlan': return <Liquiditaetsplan data={activeProject.data} calculations={calculations} />;
            case 'depreciationPlan': return <Abschreibungsplan assets={activeProject.data.assets} onAssetsChange={handleAssetsChange} settings={activeProject.data.settings} afaData={afaData} />;
            case 'settings': return <Einstellungen
                theme={theme}
                setTheme={setTheme}
                aiSettings={aiSettings}
                setAiSettings={setAiSettings}
                saveHistory={saveHistory}
                onRestore={handleRestore}
                onExportAll={handleExportAll}
                onExportSingle={handleExportSingle}
                onImport={handleImportWrapper}
                personas={personas}
                onDataChange={handleDataChange}
                savedChats={activeProject.data.savedChats || []}
                customAiPrompts={customAiPrompts || []}
                setCustomAiPrompts={setCustomAiPrompts}
                setNotification={setNotification}
                showErrorModal={showErrorModal}
                appState={useStore.getState().appState}
            />;
            default: return <div>{t('app.view_not_found')}</div>;
        }
    };
    
    if (!isInitialized) {
        return <div className="app-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--background-color)'}}><div className="spinner"></div></div>;
    }

    return (
        <div className="app-container">
            {isDebugPanelVisible && <div className="debug-panel-wrapper"><DebugPanel /></div>}
            {notification && (
                <div key={notification.id} className={`notification-toast ${notification.class || ''}`}>
                    <Icon icon="check-circle" size={20} />
                    <span>{notification.message}</span>
                </div>
            )}
            <div className="main-layout">
                <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-content-wrapper">
                        <div className="sidebar-header">
                            <div className="sidebar-logo-text">{t('app.logo_title')}</div>
                            <div className="project-selector">
                                <div className="project-selection-controls">
                                    <select value={activeProjectId || ''} onChange={(e) => handleSelectProject(e.target.value)}>
                                        {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                                    </select>
                                    <button
                                        className="btn-icon-danger"
                                        onClick={handleDeleteRequest}
                                        title={projects.length <= 1 ? t('app.delete_last_project_hint') : t('app.delete_project_hint')}
                                        disabled={projects.length <= 1}
                                    >
                                        <Icon icon="trash" size={16} />
                                    </button>
                                </div>
                                <button className="btn-primary" onClick={handleNewProject}>{t('app.new_project')}</button>
                            </div>
                        </div>
                        <nav className="main-nav">
                            <ul>
                                {navLinks.map(link => (
                                    <li key={link.id} className={view === link.id ? 'active' : ''}>
                                        <a href="#" onClick={(e) => { e.preventDefault(); setView(link.id); }}>
                                            {link.icon}
                                            <span className="nav-label">{link.label}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                            <ul className="nav-footer-list">
                                <li>
                                    <a
                                        href="#"
                                         onClick={(e) => { e.preventDefault(); if (saveStatus === 'unsaved') { saveData(useStore.getState().appState, 50); } }}
                                        className={`save-link ${saveStatus}`}
                                        title={saveStatus === 'unsaved' ? t('common.save') : t('common.saved')}
                                        aria-disabled={saveStatus !== 'unsaved'}
                                    >
                                        <Icon icon="save" className="nav-icon" />
                                        <span className="nav-label">
                                            {saveStatus === 'saved' && t('common.saved')}
                                            {saveStatus === 'unsaved' && t('common.save')}
                                            {saveStatus === 'saving' && t('common.saving')}
                                        </span>
                                    </a>
                                </li>
                                <li className={view === 'settings' ? 'active' : ''}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); setView('settings'); }} title={t('views.einstellungen')}>
                                        <Icon icon="einstellungen" className="nav-icon" />
                                        <span className="nav-label">{t('views.einstellungen')}</span>
                                    </a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                    <div className="sidebar-toggle-wrapper">
                        <button 
                            className="sidebar-toggle-btn"
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            title={isSidebarCollapsed ? t('app.toggle_sidebar_expand') : t('app.toggle_sidebar_collapse')}
                            aria-label={isSidebarCollapsed ? t('app.toggle_sidebar_expand') : t('app.toggle_sidebar_collapse')}
                        >
                            <Icon icon="arrow-left" size={20} />
                        </button>
                    </div>
                </aside>
                <main className="main-content">
                    <header className="main-header">
                        <div>
                            <h2>{navLinks.find(l => l.id === view)?.label || t('views.einstellungen')}</h2>
                             <span className="current-project-name">{activeProject?.projectName || ''}</span>
                        </div>
                    </header>
                    <div className="view-content">
                        {renderView()}
                    </div>
                </main>
            </div>
             <AppModals 
                modalInfo={modalInfo}
                setModalInfo={setModalInfo}
                activeProject={activeProject}
                executeDeleteProject={executeDeleteProject}
                executeNewProject={executeNewProject}
                executeRestore={executeRestore}
                executeSwitchProject={executeSwitchProject}
                executeResetProject={executeResetProject}
                handleImportAsCopy={handleImportAsCopy}
                handleImportOverwrite={handleImportOverwrite}
                plansToPrint={plansToPrint}
                setPlansToPrint={setPlansToPrint}
                aiSettings={aiSettings}
                setNotification={setNotification}
             />
             {activeProject && calculations && (
                <>
                    <PrintContainer
                        projectData={activeProject.data}
                        calculations={calculations}
                        plansToPrint={plansToPrint}
                    />
                    <AiAssistant
                        projectData={activeProject.data}
                        calculations={calculations}
                        aiSettings={aiSettings}
                        onDataChange={handleDataChange}
                        appState={useStore.getState().appState}
                        personas={personas}
                        handleNewProject={handleNewProject}
                        handleNewProjectFromData={handleNewProjectFromData}
                        view={view}
                     />
                </>
             )}
        </div>
    );
};

export const App = ({ config }: AppProps) => {
    return (
        <ErrorBoundary>
            <AppContent config={config} />
        </ErrorBoundary>
    );
};
