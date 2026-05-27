/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createYearlyArray } from '../utils.ts';
import type { PrivateNeed, PrivateNeedSubItem } from '../types.ts';

interface UsePrivatbedarfsplanProps {
    privateNeeds: PrivateNeed[];
    onPrivateNeedsChange: (newData: PrivateNeed[]) => void;
    planningYears: number;
}

export const usePrivatbedarfsplan = ({ privateNeeds, onPrivateNeedsChange, planningYears }: UsePrivatbedarfsplanProps) => {
    const [addModalState, setAddModalState] = useState<{ categoryId: string } | null>(null);
    const [editingState, setEditingState] = useState<{ categoryId: string; subItem: PrivateNeedSubItem } | null>(null);
    const [deleteConfirmState, setDeleteConfirmState] = useState<{ categoryId: string; subItemId: string; subItemName: string } | null>(null);
    const [resetConfirm, setResetConfirm] = useState<number | null>(null);
    const [applyToYearsConfirm, setApplyToYearsConfirm] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

    const performResetYear = useCallback((yearIndex: number) => {
        const newNeedsData = privateNeeds.map(need => {
            const newDirectCosts = need.directCosts.map((yearArr, yIdx) => 
                yIdx === yearIndex ? Array(12).fill(0) : yearArr
            );
            const newSubItems = need.subItems.map(subItem => ({
                ...subItem,
                costs: subItem.costs.map((yearArr, yIdx) => 
                    yIdx === yearIndex ? Array(12).fill(0) : yearArr
                )
            }));
            return { ...need, directCosts: newDirectCosts, subItems: newSubItems };
        });
        onPrivateNeedsChange(newNeedsData);
        setResetConfirm(null);
    }, [privateNeeds, onPrivateNeedsChange]);

    const performApplyToYears = useCallback((sourceYear: number, targetYears: number[]) => {
        const newNeedsData = privateNeeds.map(need => {
            const sourceDirectCosts = need.directCosts[sourceYear];
            const newDirectCosts = need.directCosts.map((yearArr, yIdx) => 
                targetYears.includes(yIdx) ? [...sourceDirectCosts] : yearArr
            );
            const newSubItems = need.subItems.map(subItem => {
                const sourceSubItemCosts = subItem.costs[sourceYear];
                const newSubItemCosts = subItem.costs.map((yearArr, yIdx) => 
                    targetYears.includes(yIdx) ? [...sourceSubItemCosts] : yearArr
                );
                return { ...subItem, costs: newSubItemCosts };
            });
            return { ...need, directCosts: newDirectCosts, subItems: newSubItems };
        });
        onPrivateNeedsChange(newNeedsData);
        setApplyToYearsConfirm(null);
    }, [privateNeeds, onPrivateNeedsChange]);

    const handleDirectCostChange = useCallback((categoryId: string, year: number, month: number, value: number) => {
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            const newCosts = need.directCosts.map((y, yIndex) => 
                yIndex === year ? y.map((m, mIndex) => mIndex === month ? value : m) : y
            );
            return { ...need, directCosts: newCosts };
        });
        onPrivateNeedsChange(newNeedsData);
    }, [privateNeeds, onPrivateNeedsChange]);

    const handleSubItemCostChange = useCallback((categoryId: string, subItemId: string, year: number, month: number, value: number) => {
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            const newSubItems = need.subItems.map(sub => {
                if (sub.id !== subItemId) return sub;
                const newCosts = sub.costs.map((y, yIndex) => yIndex === year ? y.map((m, mIndex) => mIndex === month ? value : m) : y);
                return { ...sub, costs: newCosts };
            });
            return { ...need, subItems: newSubItems };
        });
        onPrivateNeedsChange(newNeedsData);
    }, [privateNeeds, onPrivateNeedsChange]);

    const fillForwardInArray = (costsArray: number[][], year: number, month: number): number[][] => {
        const valueToCopy = costsArray[year]?.[month] ?? 0;
        return costsArray.map((y, yIndex) => {
            if (yIndex !== year) return [...y];
            return y.map((mValue, mIndex) => mIndex > month ? valueToCopy : mValue);
        });
    };

    const handleFillForwardDirect = useCallback((categoryId: string, year: number, month: number) => {
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            return { ...need, directCosts: fillForwardInArray(need.directCosts, year, month) };
        });
        onPrivateNeedsChange(newNeedsData);
    }, [privateNeeds, onPrivateNeedsChange]);

    const handleFillForwardSubItem = useCallback((categoryId: string, subItemId: string, year: number, month: number) => {
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            const newSubItems = need.subItems.map(sub => {
                if (sub.id !== subItemId) return sub;
                return { ...sub, costs: fillForwardInArray(sub.costs, year, month) };
            });
            return { ...need, subItems: newSubItems };
        });
        onPrivateNeedsChange(newNeedsData);
    }, [privateNeeds, onPrivateNeedsChange]);

    const handleToggleExpand = useCallback((categoryId: string) => {
        const newNeedsData = privateNeeds.map(need => 
            need.id === categoryId ? { ...need, isExpanded: !need.isExpanded } : need
        );
        onPrivateNeedsChange(newNeedsData);
    }, [privateNeeds, onPrivateNeedsChange]);

    const handleAddSubItem = useCallback((name: string, description: string, activeInYears: number[]) => {
        if (!addModalState) return;
        const { categoryId } = addModalState;

        const newSubItem: PrivateNeedSubItem = {
            id: uuidv4(),
            name,
            description,
            costs: createYearlyArray(planningYears, 0),
            activeInYears: activeInYears,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            return { ...need, subItems: [...need.subItems, newSubItem] };
        });
        
        onPrivateNeedsChange(newNeedsData);
        setAddModalState(null);
    }, [addModalState, privateNeeds, planningYears, onPrivateNeedsChange]);
    
    const handleSaveSubItem = useCallback((categoryId: string, subItemId: string, updatedData: { name: string, description: string, activeInYears: number[] }) => {
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            const newSubItems = need.subItems.map(item => {
                if (item.id !== subItemId) return item;
                const newCosts = item.costs.map((yearCosts, yearIndex) => 
                    !updatedData.activeInYears.includes(yearIndex) ? Array(12).fill(0) : yearCosts
                );
                return { ...item, name: updatedData.name, description: updatedData.description, activeInYears: updatedData.activeInYears, costs: newCosts, updatedAt: new Date().toISOString() };
            });
            return { ...need, subItems: newSubItems };
        });
        onPrivateNeedsChange(newNeedsData);
        setEditingState(null);
    }, [privateNeeds, onPrivateNeedsChange]);

    const handleDeleteSubItem = useCallback(() => {
        if (!deleteConfirmState) return;
        const { categoryId, subItemId } = deleteConfirmState;
        
        const newNeedsData = privateNeeds.map(need => {
            if (need.id !== categoryId) return need;
            return { ...need, subItems: need.subItems.filter(item => item.id !== subItemId) };
        });

        onPrivateNeedsChange(newNeedsData);
        setDeleteConfirmState(null);
    }, [deleteConfirmState, privateNeeds, onPrivateNeedsChange]);

    const handleItemHover = useCallback((e: React.MouseEvent, description?: string) => {
        if (description) setTooltip({ x: e.clientX + 10, y: e.clientY + 10, content: description });
    }, []);
    
    const handleItemHoverEnd = useCallback(() => setTooltip(null), []);

    return {
        addModalState, setAddModalState,
        editingState, setEditingState,
        deleteConfirmState, setDeleteConfirmState,
        resetConfirm, setResetConfirm,
        applyToYearsConfirm, setApplyToYearsConfirm,
        tooltip,
        performResetYear,
        performApplyToYears,
        handleDirectCostChange,
        handleSubItemCostChange,
        handleFillForwardDirect,
        handleFillForwardSubItem,
        handleToggleExpand,
        handleAddSubItem,
        handleSaveSubItem,
        handleDeleteSubItem,
        handleItemHover,
        handleItemHoverEnd
    };
};
