/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState } from 'react';
import { formatCurrency, formatChartAxisLabel } from '../utils.ts';

type Dataset = {
    label: string;
    values: number[];
    type: 'primary' | 'positive' | 'danger' | 'secondary' | 'bar1' | 'bar2' | 'bar3';
};

interface BarChartProps {
    labels: string[];
    datasets: Dataset[];
    title: string;
    isStale: boolean;
    width?: number;
    height?: number;
}

const typeToVarMap: Record<string, string> = {
    primary: 'var(--primary-color)',
    positive: 'var(--positive-color)',
    danger: 'var(--danger-color)',
    secondary: 'var(--secondary-color)',
    bar1: 'var(--chart-bar-color-1)',
    bar2: 'var(--chart-bar-color-2)',
    bar3: 'var(--chart-bar-color-3)',
};

export const BarChart = ({ labels, datasets, title, isStale, width = 500, height = 281 }: BarChartProps) => {
    const [interaction, setInteraction] = useState<{ x: number, y: number, content: string[], groupIndex: number } | null>(null);

    const containerWidth = width;
    const containerHeight = height;
    const chartArea = { top: 50, right: 20, bottom: 40, left: 60 };
    const chartWidth = containerWidth - chartArea.left - chartArea.right;
    const chartHeight = containerHeight - chartArea.top - chartArea.bottom;

    const validDatasets = datasets.filter(d => d && d.values && Array.isArray(d.values));
    const allValues = validDatasets.flatMap(d => d.values);
    const maxValue = allValues.length > 0 ? Math.max(0, ...allValues) : 0;
    const minValue = allValues.length > 0 ? Math.min(0, ...allValues) : 0;
    
    const yRange = maxValue - minValue;
    const effectiveYRange = yRange === 0 ? 1 : yRange;

    const yScale = (value: number) => chartArea.top + chartHeight - ((value - minValue) / effectiveYRange) * chartHeight;
    
    const barWidth = chartWidth / labels.length;
    const groupPadding = 0.2;
    const barPadding = 0.05;

    const groupWidth = barWidth * (1 - groupPadding);
    const individualBarWidth = (groupWidth / validDatasets.length) * (1 - barPadding);

    const handleMouseMove = (e: React.MouseEvent, groupIndex: number) => {
        const svg = e.currentTarget.closest('svg');
        if (!svg) return;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        const content = validDatasets.map(d => `${d.label}: ${formatCurrency(d.values?.[groupIndex])}`);
        setInteraction({ x: svgPoint.x, y: svgPoint.y, content, groupIndex });
    };

    const handleMouseLeave = () => setInteraction(null);
    
    const legendItems = validDatasets.reduce((acc, d) => {
        const previous = acc[acc.length - 1];
        const offset = previous ? previous.offset + (previous.label.length * 6.5) + 26 : 0;
        acc.push({ ...d, offset });
        return acc;
    }, [] as (Dataset & { offset: number })[]);

    return (
        <div className="chart-container">
            <h4>
                {title}
                {isStale && <span className="updating-indicator" title="Diagramm wird aktualisiert..."></span>}
            </h4>
            <svg width="100%" viewBox={`0 0 ${containerWidth} ${containerHeight}`} preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby={`chart-title-${title.replace(/\s/g, '')}`}>
                <title id={`chart-title-${title.replace(/\s/g, '')}`}>{title}</title>
                <line x1={chartArea.left} y1={chartArea.top} x2={chartArea.left} y2={chartArea.top + chartHeight} stroke="var(--border-color)" />
                <line x1={chartArea.left} y1={yScale(0)} x2={chartArea.left + chartWidth} y2={yScale(0)} stroke="var(--border-color)" />
                
                {[...Array(5)].map((_, i) => {
                    const value = minValue + (i / 4) * (maxValue - minValue);
                    return (
                        <g key={i}>
                            <text x={chartArea.left - 8} y={yScale(value)} textAnchor="end" alignmentBaseline="middle" fontSize="10px" fill="var(--text-color)">{formatChartAxisLabel(value)}</text>
                            <line x1={chartArea.left-4} y1={yScale(value)} x2={chartArea.left} y2={yScale(value)} stroke="var(--border-color)" />
                        </g>
                    )
                })}
                
                {labels.length > 0 && labels.map((label, i) => (
                    <g key={label} onMouseMove={e => handleMouseMove(e, i)} onMouseLeave={handleMouseLeave} style={{ cursor: 'pointer' }}>
                         <rect x={chartArea.left + i * barWidth} y={chartArea.top} width={barWidth} height={chartHeight} fill="transparent" />
                        <text x={chartArea.left + i * barWidth + barWidth / 2} y={chartArea.top + chartHeight + 20} textAnchor="middle" fontSize="11px" fill="var(--text-color)">{label}</text>
                        {validDatasets.map((dataset, j) => {
                            const x = chartArea.left + i * barWidth + (barWidth * groupPadding / 2) + j * (individualBarWidth + (groupWidth * barPadding / validDatasets.length));
                            const value = dataset.values?.[i] ?? 0;
                            const rx = Math.min(8, individualBarWidth / 3);
                            let d = "";

                            if (value >= 0) {
                                const yTop = yScale(value);
                                const yBottom = yScale(0);
                                const barHeight = yBottom - yTop;
                                
                                if (barHeight < rx * 2) {
                                    d = `M ${x} ${yBottom} L ${x} ${yTop} L ${x + individualBarWidth} ${yTop} L ${x + individualBarWidth} ${yBottom} Z`;
                                } else {
                                    d = `M ${x},${yBottom} L ${x},${yTop + rx} A ${rx},${rx} 0 0 1 ${x + rx},${yTop} L ${x + individualBarWidth - rx},${yTop} A ${rx},${rx} 0 0 1 ${x + individualBarWidth},${yTop + rx} L ${x + individualBarWidth},${yBottom} Z`;
                                }
                            } else { // value < 0
                                const yTop = yScale(0);
                                const yBottom = yScale(value);
                                const barHeight = yBottom - yTop;

                                if (barHeight < rx * 2) {
                                    d = `M ${x} ${yTop} L ${x} ${yBottom} L ${x + individualBarWidth} ${yBottom} L ${x + individualBarWidth} ${yTop} Z`;
                                } else {
                                     d = `M ${x},${yTop} L ${x + individualBarWidth},${yTop} L ${x + individualBarWidth},${yBottom - rx} A ${rx},${rx} 0 0 0 ${x + individualBarWidth - rx},${yBottom} L ${x + rx},${yBottom} A ${rx},${rx} 0 0 0 ${x},${yBottom - rx} Z`;
                                }
                            }

                            return (
                                <path
                                    key={dataset.label}
                                    d={d}
                                    fill={typeToVarMap[dataset.type] || 'var(--primary-color)'}
                                    opacity={interaction && interaction.groupIndex !== i ? 0.5 : 1}
                                    style={{transition: 'opacity 0.2s'}}
                                />
                            );
                        })}
                    </g>
                ))}

                <g transform={`translate(${chartArea.left}, 10)`}>
                    {legendItems.map(d => (
                        <g key={d.label} transform={`translate(${d.offset}, 0)`}>
                            <circle cx="6" cy="6" r="6" fill={typeToVarMap[d.type] || 'var(--primary-color)'} />
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