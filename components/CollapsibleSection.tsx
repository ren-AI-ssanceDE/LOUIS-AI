/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState } from 'react';
import { Icon } from './Icon.tsx';

export const CollapsibleSection = ({ title, children, defaultOpen = false }: { title: string, children: React.ReactNode, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const id = `collapsible-section-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="card collapsible-section">
            <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-controls={id}>
                <h2>{title}</h2>
                <span className={`collapsible-icon ${isOpen ? 'expanded' : ''}`}>
                    <Icon icon="chevron-down" size={24} />
                </span>
            </button>
            <div id={id} className={`collapsible-content ${isOpen ? 'expanded' : ''}`}>
                <div className="collapsible-content-inner">
                    {children}
                </div>
            </div>
        </div>
    );
};