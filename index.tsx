/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 *
 * This software is the proprietary and confidential property of
 * Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de.
 * Unauthorized copying of this file, via any medium, is strictly prohibited.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './i18n.ts';
import { App } from './App.tsx';
import { config } from './config.ts';

const container = document.getElementById('louis-ai-app');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><App config={config} /></React.StrictMode>);
}
