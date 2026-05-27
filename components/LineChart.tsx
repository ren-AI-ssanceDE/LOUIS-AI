/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState } from 'react';
import { formatCurrency, formatChartAxisLabel } from '../utils.ts';

interface LineChartProps {
    labels: string[];
    datasets: { label: string, values: number[] }[];
    title: string;
    isStale: boolean;
}

export const LineChart = ({ labels, datasets, title, isStale }: LineChartProps) => {
    const [interaction, setInteraction] = useState<{ x: number, y: number, content: string[], pointIndex: number } | null>(null);

    const containerWidth = 500;
    const containerHeight = 300;
    const chartArea = { top: 60, right: 20, bottom: 70, left: 60 }; // Increased bottom margin for rotated labels
    const chartWidth = containerWidth - chartArea.left - chartArea.right;
    const chartHeight = containerHeight - chartArea.top - chartArea.bottom;

    const visibleDatasets = datasets.filter(d => d.values && Array.isArray(d.values) && d.values.length > 0 && !d.values.every(v => v === 0));
    
    const allValues = visibleDatasets.flatMap(d => d.values);
    
    // Use the actual data range for scaling, providing a fallback for empty data.
    const dataMax = allValues.length > 0 ? Math.max(...allValues) : 1;
    const dataMin = allValues.length > 0 ? Math.min(...allValues) : 0;

    const getScaleBounds = (min: number, max: number) => {
        if (!isFinite(min) || !isFinite(max)) {
            min = 0;
            max = 1;
        }
        if (min === max) {
            min -= 1;
            max += 1;
        }

        const range = max - min;
        const tickCount = 5; // Target number of ticks.
        const roughStep = range / (tickCount - 1);
        const exponent = Math.floor(Math.log10(roughStep));
        const powerOf10 = Math.pow(10, exponent);
        const magnitude = roughStep / powerOf10;

        let niceStep;
        if (magnitude < 1.5) {
            niceStep = 1;
        } else if (magnitude < 3) {
            niceStep = 2;
        } else if (magnitude < 7) {
            niceStep = 5;
        } else {
            niceStep = 10;
        }
        
        const step = niceStep * powerOf10;
        
        const scaledMin = Math.floor(min / step) * step;
        const scaledMax = Math.ceil(max / step) * step;
        
        const ticks = [];
        let currentTick = scaledMin;
        // Use a tolerance to avoid infinite loops with floating point issues
        while(currentTick <= scaledMax + step * 0.01) {
            ticks.push(Number(currentTick.toPrecision(15)));
            currentTick += step;
        }
        
        if (ticks.length === 0) {
            return { scaledMin: min, scaledMax: max, ticks: [min, max] };
        }
        
        const firstTick = ticks[0] ?? min;
        const lastTick = ticks[ticks.length - 1] ?? max;
        
        return { scaledMin: firstTick, scaledMax: lastTick, ticks };
    };
    
    const { scaledMin, scaledMax, ticks } = getScaleBounds(dataMin, dataMax);

    const yScale = (value: number) => {
        const range = scaledMax - scaledMin;
        if (range === 0) return chartArea.top + chartHeight / 2;
        return chartArea.top + chartHeight - ((value - scaledMin) / range) * chartHeight;
    };
    
    const xScale = (index: number) => {
        if (labels.length <= 1) return chartArea.left + chartWidth / 2;
        return chartArea.left + (index / (labels.length - 1)) * chartWidth;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const svg = e.currentTarget.closest('svg');
        if (!svg) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());

        const pointIndex = Math.round(((svgPoint.x - chartArea.left) / chartWidth) * (labels.length - 1));
        if (pointIndex < 0 || pointIndex >= labels.length) {
            handleMouseLeave();
            return;
        }

        const content = [`${labels[pointIndex] || ''}:`, ...datasets.map(d => `${d.label}: ${formatCurrency(d.values?.[pointIndex])}`)];
        setInteraction({ x: svgPoint.x, y: svgPoint.y, content, pointIndex });
    };
    
    const handleMouseLeave = () => setInteraction(null);

    const lineColors = [
        'var(--chart-line-color-1)',
        'var(--chart-line-color-2)',
        'var(--chart-line-color-3)',
        'var(--chart-line-color-4)',
        'var(--chart-line-color-5)',
    ];

    const legendItems = visibleDatasets.reduce((acc, d) => {
        const previous = acc[acc.length - 1];
        const offset = previous ? previous.offset + (previous.label.length * 6.5) + 26 : 0;
        acc.push({ ...d, offset });
        return acc;
    }, [] as (typeof visibleDatasets[0] & { offset: number })[]);

    // Dynamically determine how many labels to show to prevent overlap
    const estimatedLabelWidth = 35; // Estimated px width needed per rotated label
    const maxVisibleLabels = Math.floor(chartWidth / estimatedLabelWidth);
    const labelSkipInterval = labels.length > maxVisibleLabels ? Math.ceil(labels.length / maxVisibleLabels) : 1;

    const labelsToShow = labels
        .map((label, index) => ({ label, index }))
        .filter((_, index) => index % labelSkipInterval === 0);

    return (
        <div className="chart-container">
            <h4>
                {title}
                {isStale && <span className="updating-indicator" title="Diagramm wird aktualisiert..."></span>}
            </h4>
            <svg width="100%" viewBox={`0 0 ${containerWidth} ${containerHeight}`} preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`chart-title-${title.replace(/\s/g, '')}`}>
                <title id={`chart-title-${title.replace(/\s/g, '')}`}>{title}</title>
                
                {ticks.map((tick, i) => (
                    <g key={i}>
                        <text x={chartArea.left - 8} y={yScale(tick)} textAnchor="end" alignmentBaseline="middle" fontSize="10px" fill="var(--text-color)">{formatChartAxisLabel(tick)}</text>
                        <line 
                            x1={chartArea.left} y1={yScale(tick)} x2={chartArea.left + chartWidth} y2={yScale(tick)} 
                            stroke="var(--border-color)"
                            strokeDasharray={tick === 0 ? undefined : '2 3'}
                        />
                    </g>
                ))}
                
                <line x1={chartArea.left} y1={chartArea.top} x2={chartArea.left} y2={chartArea.top + chartHeight} stroke="var(--border-color)" />
                {(scaledMin < 0 && scaledMax > 0) && (
                    <line x1={chartArea.left} y1={yScale(0)} x2={chartArea.left + chartWidth} y2={yScale(0)} stroke="var(--border-color)" />
                )}

                {labelsToShow.map(({ label, index }) => (
                    <g key={index}>
                        <text
                            x={xScale(index)}
                            y={chartArea.top + chartHeight + 10}
                            transform={`rotate(-45, ${xScale(index)}, ${chartArea.top + chartHeight + 10})`}
                            textAnchor="end"
                            fontSize="11px"
                            fill="var(--text-color)"
                            dx="-4"
                            dy="8"
                        >
                            {label}
                        </text>
                    </g>
                ))}
                
                <g onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ cursor: 'pointer' }}>
                    <rect x={chartArea.left} y={chartArea.top} width={chartWidth} height={chartHeight} fill="transparent" />
                    {visibleDatasets.map((dataset, i) => {
                        const pathData = dataset.values
                            .map((value, index) => {
                                if (isNaN(value)) return '';
                                const x = xScale(index);
                                const y = yScale(value);
                                return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
                            })
                            .join(' ');

                        return <path key={i} d={pathData} fill="none" stroke={lineColors[i % lineColors.length]} strokeWidth="2" />;
                    })}

                    {interaction && (
                        <g>
                            <line x1={xScale(interaction.pointIndex)} y1={chartArea.top} x2={xScale(interaction.pointIndex)} y2={chartArea.top + chartHeight} stroke="var(--border-color)" strokeDasharray="3 3" />
                            {visibleDatasets.map((d, i) => (
                                <circle key={i} cx={xScale(interaction.pointIndex)} cy={yScale(d.values?.[interaction.pointIndex])} r="4" fill={lineColors[i % lineColors.length]} stroke="var(--sidebar-bg)" strokeWidth="2" />
                            ))}
                        </g>
                    )}
                </g>
                
                 <g transform={`translate(${chartArea.left}, 10)`}>
                    {legendItems.map((d, i) => (
                        <g key={d.label} transform={`translate(${d.offset}, 0)`}>
                            <circle cx="6" cy="6" r="6" fill={lineColors[i % lineColors.length]} />
                            <text x="18" y="10" fontSize="10px" fill="var(--text-color)">{d.label}</text>
                        </g>
                    ))}
                </g>
                
                {interaction && (() => {
                    const PADDING = 8;
                    const LINE_HEIGHT = 14;
                    const tooltipHeight = interaction.content.length * LINE_HEIGHT + PADDING;
                    const longestLine = Math.max(...interaction.content.map(t => t.length));
                    const tooltipWidth = longestLine * 6.5 + 2 * PADDING;

                    let x = interaction.x + 15;
                    let y = interaction.y - tooltipHeight / 2;
                    
                    if (x + tooltipWidth > containerWidth) {
                        x = interaction.x - tooltipWidth - 15;
                    }
                    if (x < 0) {
                        x = PADDING;
                    }

                    if (y < 0) y = 0;
                    if (y + tooltipHeight > containerHeight) y = containerHeight - tooltipHeight;

                    return (
                        <g className="chart-tooltip" transform={`translate(${x}, ${y})`}>
                            <rect className="chart-tooltip-bg" fill="var(--sidebar-bg)" x={0} y={0} width={tooltipWidth} height={tooltipHeight} rx="4" />
                            {interaction.content.map((line, i) => (
                                <text key={i} className="chart-tooltip-text" fill="var(--sidebar-text)" x={PADDING} y={PADDING + (i * LINE_HEIGHT) + LINE_HEIGHT / 2} alignmentBaseline="middle">{line}</text>
                            ))}
                        </g>
                    );
                })()}
            </svg>
        </div>
    );
};