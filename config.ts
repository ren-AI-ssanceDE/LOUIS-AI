/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

// This interface defines the structure of our application's configuration.
export interface AppConfig {
    dataUrlBase: string;
    useLocalDbFile?: boolean;
    user: {
        isLoggedIn: boolean;
    };
}

// --- CONFIGURATION ---
export const config: AppConfig = {
    dataUrlBase: '/', // Assets are at the root
    useLocalDbFile: true, // Enables loading from local-dev-db.json
    user: {
        isLoggedIn: true,
    },
};