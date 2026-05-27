/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createYearlyArray } from '../utils.ts';
import type { FinancialData, OperationalCostsData, OpCostCategoryKey, OpCostSubItem } from '../types.ts';

interface UseErtragsplanProps {
    data: FinancialData;
    onOpCostsChange: (d: OperationalCostsData) => void;
    planningYears: number;
}

export const useErtragsplan = ({ data, onOpCostsChange, planningYears }: UseErtragsplanProps) => {
    const [addModalState, setAddModalState] = useState<{ category: OpCostCategoryKey } | null>(null);
    const [editingState, setEditingState] = useState<{ categoryKey: OpCostCategoryKey; subItem: OpCostSubItem } | null>(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState<{ categoryKey: OpCostCategoryKey; subItemId: string; subItemName: string } | null>(null);
    const [resetConfirm, setResetConfirm] = useState<number | null>(null);
    const [applyToYearsConfirm, setApplyToYearsConfirm] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

    const performResetYear = useCallback((yearIndex: number) => {
        const newOpCosts: OperationalCostsData = { ...data.operationalCosts };
        
        (Object.keys(newOpCosts) as OpCostCategoryKey[]).forEach(key => {
            const category = newOpCosts[key];
            const newDirectCosts = category.directCosts.map((yearArr, yIdx) =>
                yIdx === yearIndex ? Array(12).fill(0) : yearArr
            );
            const newSubItems = category.subItems.map(subItem => ({
                ...subItem,
                costs: subItem.costs.map((yearArr, yIdx) => 
                    yIdx === yearIndex ? Array(12).fill(0) : yearArr
                )
            }));

            newOpCosts[key] = {
                ...category,
                directCosts: newDirectCosts,
                subItems: newSubItems
            };
        });
        onOpCostsChange(newOpCosts);
        setResetConfirm(null);
    }, [data.operationalCosts, onOpCostsChange]);

    const performApplyToYears = useCallback((sourceYear: number, targetYears: number[]) => {
        const newOpCosts: OperationalCostsData = { ...data.operationalCosts };
        
        (Object.keys(newOpCosts) as OpCostCategoryKey[]).forEach(key => {
            const category = newOpCosts[key];
            const sourceDirectCosts = category.directCosts[sourceYear];
            const newDirectCosts = category.directCosts.map((yearArr, yIdx) =>
                targetYears.includes(yIdx) ? [...sourceDirectCosts] : yearArr
            );
            const newSubItems = category.subItems.map(subItem => {
                const sourceSubItemCosts = subItem.costs[sourceYear];
                const newSubItemCosts = subItem.costs.map((yearArr, yIdx) => 
                    targetYears.includes(yIdx) ? [...sourceSubItemCosts] : yearArr
                );
                return { ...subItem, costs: newSubItemCosts };
            });

            newOpCosts[key] = {
                ...category,
                directCosts: newDirectCosts,
                subItems: newSubItems
            };
        });
        onOpCostsChange(newOpCosts);
        setApplyToYearsConfirm(null);
    }, [data.operationalCosts, onOpCostsChange]);

    const handleOpCostChange = useCallback((category: OpCostCategoryKey, year: number, month: number, value: number) => {
        const newCosts = {
            ...data.operationalCosts,
            [category]: {
                ...data.operationalCosts[category],
                directCosts: data.operationalCosts[category].directCosts.map((y, yIndex) => 
                    yIndex === year 
                    ? y.map((m, mIndex) => mIndex === month ? value : m)
                    : y
                )
            }
        };
        onOpCostsChange(newCosts);
    }, [data.operationalCosts, onOpCostsChange]);

    const handleSubItemCostChange = useCallback((category: OpCostCategoryKey, subItemId: string, year: number, month: number, value: number) => {
        const newCosts = { ...data.operationalCosts };
        const categoryData = newCosts[category];
        newCosts[category] = {
            ...categoryData,
            subItems: categoryData.subItems.map(subItem => {
                if (subItem.id !== subItemId) return subItem;
                const newSubItemCosts = subItem.costs.map((y, yIndex) => yIndex === year ? y.map((m, mIndex) => mIndex === month ? value : m) : y );
                return { ...subItem, costs: newSubItemCosts };
            })
        };
        onOpCostsChange(newCosts);
    }, [data.operationalCosts, onOpCostsChange]);

    const fillForwardInArray = (costsArray: number[][], year: number, month: number): number[][] => {
        const valueToCopy = costsArray[year]?.[month] ?? 0;
        return costsArray.map((y, yIndex) => {
            if (yIndex !== year) return [...y];
            return y.map((mValue, mIndex) => mIndex > month ? valueToCopy : mValue);
        });
    };

    const handleFillForwardDirect = useCallback((category: OpCostCategoryKey, year: number, month: number) => {
        const newCosts = { ...data.operationalCosts };
        const oldCat = newCosts[category];
        newCosts[category] = {
            ...oldCat,
            directCosts: fillForwardInArray(oldCat.directCosts, year, month)
        };
        onOpCostsChange(newCosts);
    }, [data.operationalCosts, onOpCostsChange]);

    const handleFillForwardSubItem = useCallback((category: OpCostCategoryKey, subItemId: string, year: number, month: number) => {
        const newCosts = { ...data.operationalCosts };
        const oldCat = newCosts[category];
        newCosts[category] = {
            ...oldCat,
            subItems: oldCat.subItems.map(subItem => {
                if (subItem.id !== subItemId) return subItem;
                return { ...subItem, costs: fillForwardInArray(subItem.costs, year, month) };
            })
        };
        onOpCostsChange(newCosts);
    }, [data.operationalCosts, onOpCostsChange]);
    
    const handleToggleExpand = useCallback((category: OpCostCategoryKey) => {
        const newCosts = { ...data.operationalCosts };
        newCosts[category] = { ...newCosts[category], isExpanded: !newCosts[category].isExpanded };
        onOpCostsChange(newCosts);
    }, [data.operationalCosts, onOpCostsChange]);
    
    const handleAddSubItem = useCallback((name: string, description: string, activeInYears: number[]) => {
        if (!addModalState) return;
        const { category } = addModalState;

        const newCosts = { ...data.operationalCosts };
        const newSubItem: OpCostSubItem = {
            id: uuidv4(),
            name: name,
            description: description,
            costs: createYearlyArray(planningYears, 0),
            activeInYears,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        newCosts[category] = {
            ...newCosts[category],
            subItems: [...newCosts[category].subItems, newSubItem]
        };
        
        onOpCostsChange(newCosts);
        setAddModalState(null);
    }, [addModalState, data.operationalCosts, planningYears, onOpCostsChange]);

    const handleSaveSubItem = useCallback((categoryKey: OpCostCategoryKey, subItemId: string, updatedData: { name: string, description: string, activeInYears: number[] }) => {
        const newCosts = { ...data.operationalCosts };
        const category = newCosts[categoryKey];
        newCosts[categoryKey] = {
            ...category,
            subItems: category.subItems.map(item => {
                if (item.id !== subItemId) return item;
                const newSubItemCosts = item.costs.map((yearCosts, yearIndex) => 
                    !updatedData.activeInYears.includes(yearIndex) ? Array(12).fill(0) : yearCosts
                );
                return { ...item, name: updatedData.name, description: updatedData.description, activeInYears: updatedData.activeInYears, costs: newSubItemCosts, updatedAt: new Date().toISOString() };
            })
        };
        onOpCostsChange(newCosts);
        setEditingState(null);
    }, [data.operationalCosts, onOpCostsChange]);
    
    const handleDeleteSubItem = useCallback(() => {
        if (!deleteConfirmState) return;
        const { categoryKey, subItemId } = deleteConfirmState;
        
        const newCosts = { ...data.operationalCosts };
        const category = newCosts[categoryKey];
        newCosts[categoryKey] = {
            ...category,
            subItems: category.subItems.filter(item => item.id !== subItemId)
        };

        onOpCostsChange(newCosts);
        setDeleteConfirmState(null);
    }, [deleteConfirmState, data.operationalCosts, onOpCostsChange]);

    const handleSubItemHover = (e: React.MouseEvent, description?: string) => {
        if (description) { setTooltip({ x: e.clientX, y: e.clientY, content: description }); }
    };
    
    const handleSubItemHoverEnd = () => setTooltip(null);

    return {
        addModalState, setAddModalState,
        editingState, setEditingState,
        deleteConfirmState, setDeleteConfirmState,
        resetConfirm, setResetConfirm,
        applyToYearsConfirm, setApplyToYearsConfirm,
        tooltip,
        performResetYear,
        performApplyToYears,
        handleOpCostChange,
        handleSubItemCostChange,
        handleFillForwardDirect,
        handleFillForwardSubItem,
        handleToggleExpand,
        handleAddSubItem,
        handleSaveSubItem,
        handleDeleteSubItem,
        handleSubItemHover,
        handleSubItemHoverEnd
    };
};
