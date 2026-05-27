/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import type { FinancialData, Scenario, ScenarioAdjustment, OpCostCategoryKey } from '../types.ts';

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const applyPercentageChange = (value: number, change: number): number => {
    return value * (1 + change / 100);
};

export const applyScenario = (baseData: FinancialData, scenario: Scenario): FinancialData => {
    const modifiedData = deepClone(baseData);

    scenario.adjustments.forEach((adj: ScenarioAdjustment) => {
        for (let y = adj.startYear; y <= adj.endYear; y++) {
            if (y >= modifiedData.settings.planningYears) continue;

            for (let m = 0; m < 12; m++) {
                if (adj.target === 'salesForecast') {
                    const targetProductIds = adj.targetId === 'all'
                        ? modifiedData.products.map(p => p.id)
                        : [adj.targetId];
                    
                    targetProductIds.forEach(productId => {
                        if (modifiedData.sales[productId] && modifiedData.sales[productId][y]) {
                            const originalValue = modifiedData.sales[productId][y][m] || 0;
                            modifiedData.sales[productId][y][m] = Math.round(applyPercentageChange(originalValue, adj.changeValue));
                        }
                    });
                } else if (adj.target === 'operationalCosts') {
                    const targetCategoryKeys = adj.targetId === 'all'
                        ? Object.keys(modifiedData.operationalCosts) as OpCostCategoryKey[]
                        : [adj.targetId as OpCostCategoryKey];

                    targetCategoryKeys.forEach(key => {
                        const category = modifiedData.operationalCosts[key];
                        if (category) {
                             // Apply to direct costs
                            const originalDirect = category.directCosts[y]?.[m] || 0;
                            if (originalDirect > 0) {
                                category.directCosts[y][m] = applyPercentageChange(originalDirect, adj.changeValue);
                            }

                            // Apply to sub-items
                            category.subItems.forEach(subItem => {
                                const originalSub = subItem.costs[y]?.[m] || 0;
                                if (originalSub > 0) {
                                   subItem.costs[y][m] = applyPercentageChange(originalSub, adj.changeValue);
                                }
                            });
                        }
                    });
                }
            }
        }
    });

    return modifiedData;
};