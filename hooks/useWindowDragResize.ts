/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { useState, useEffect, useRef } from 'react';

type InteractionState = {
    mode: 'drag' | 'resize';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
};

export const useWindowDragResize = (initialW: number, initialH: number) => {
    const windowRef = useRef<HTMLDivElement>(null);
    const [interaction, setInteraction] = useState<InteractionState | null>(null);

    const [dimensions, setDimensions] = useState({
        x: window.innerWidth - initialW - 20,
        y: Math.max(20, window.innerHeight - initialH - 80),
        width: initialW,
        height: initialH
    });

    const handleDragMouseDown = (e: React.MouseEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest('button, input, select, textarea, .ai-chat-resize-handle')) return;
        e.preventDefault();
        setInteraction({
            mode: 'drag',
            startX: e.clientX,
            startY: e.clientY,
            initialX: dimensions.x,
            initialY: dimensions.y,
            initialWidth: dimensions.width,
            initialHeight: dimensions.height,
        });
    };

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setInteraction({
            mode: 'resize',
            startX: e.clientX,
            startY: e.clientY,
            initialX: dimensions.x,
            initialY: dimensions.y,
            initialWidth: dimensions.width,
            initialHeight: dimensions.height,
        });
    };

    useEffect(() => {
        if (!interaction || !windowRef.current) return;

        const windowEl = windowRef.current;

        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            const dx = e.clientX - interaction.startX;
            const dy = e.clientY - interaction.startY;

            if (interaction.mode === 'drag') {
                const newX = interaction.initialX + dx;
                const newY = interaction.initialY + dy;
                // Add margins to keep window accessible
                const margin = 20;
                const constrainedX = Math.max(margin, Math.min(newX, window.innerWidth - interaction.initialWidth - margin));
                const constrainedY = Math.max(margin, Math.min(newY, window.innerHeight - interaction.initialHeight - margin));
                windowEl.style.left = `${constrainedX}px`;
                windowEl.style.top = `${constrainedY}px`;
            } else if (interaction.mode === 'resize') {
                // Ensure window stays within viewport while resizing from top-left
                const minW = 350;
                const minH = 400;
                const maxW = window.innerWidth - 40;
                const maxH = window.innerHeight - 40;
                
                const newWidth = Math.max(minW, Math.min(maxW, interaction.initialWidth - dx));
                const newHeight = Math.max(minH, Math.min(maxH, interaction.initialHeight - dy));
                
                // Adjust X and Y because resizing from top-left shifts the origin
                const newX = interaction.initialX + (interaction.initialWidth - newWidth);
                const newY = interaction.initialY + (interaction.initialHeight - newHeight);
                
                // Final safety constraint
                const constrainedX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
                const constrainedY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));

                windowEl.style.width = `${newWidth}px`;
                windowEl.style.height = `${newHeight}px`;
                windowEl.style.left = `${constrainedX}px`;
                windowEl.style.top = `${constrainedY}px`;
            }
        };

        const handleMouseUp = () => {
            document.body.classList.remove('dragging');
            setInteraction(null);
            
            const newWidth = parseInt(windowEl.style.width, 10);
            const newHeight = parseInt(windowEl.style.height, 10);
            const newX = parseInt(windowEl.style.left, 10);
            const newY = parseInt(windowEl.style.top, 10);

            setDimensions({ width: newWidth, height: newHeight, x: newX, y: newY });
        };

        document.body.classList.add('dragging');
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.classList.remove('dragging');
        };
    }, [interaction]);

    return {
        windowRef,
        dimensions,
        interaction,
        handleDragMouseDown,
        handleResizeMouseDown
    };
};
