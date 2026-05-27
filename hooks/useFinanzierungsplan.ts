/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { FinancingItem, StartupCosts, CompanySettings } from '../types.ts';

interface UseFinanzierungsplanProps {
    data: FinancingItem[];
    setData: (d: FinancingItem[]) => void;
    startupCosts: StartupCosts;
    setStartupCosts: (d: StartupCosts) => void;
    settings: CompanySettings;
}

export const useFinanzierungsplan = ({ data, setData, startupCosts, setStartupCosts, settings }: UseFinanzierungsplanProps) => {
    const [deleteConfirm, setDeleteConfirm] = useState<FinancingItem | null>(null);
    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit', type?: 'equity' | 'debt', item?: FinancingItem } | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string } | null>(null);

    const handleItemHover = useCallback((e: React.MouseEvent, description?: string) => {
        if (description && description.trim()) {
            setTooltip({ x: e.clientX, y: e.clientY, content: description });
        }
    }, []);

    const handleItemMouseLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    const updateItem = useCallback(<K extends keyof FinancingItem>(id: string, field: K, value: FinancingItem[K]) => {
        setData(data.map(item => {
            if (item.id !== id) return item;
            const updatedItem = { ...item, [field]: value };
            if (field === 'startDate' && updatedItem.endDate && typeof value === 'string' && new Date(value) > new Date(updatedItem.endDate)) {
                updatedItem.endDate = value;
            }
            if (field === 'endDate' && updatedItem.startDate && typeof value === 'string' && new Date(value) < new Date(updatedItem.startDate)) {
                updatedItem.startDate = value;
            }
            return updatedItem;
        }));
    }, [data, setData]);
    
    const handleSaveItem = useCallback((formData: { source: string, description: string }) => {
        if (!modalState) return;

        if (modalState.mode === 'add') {
            const type = modalState.type!;
            let newItem: FinancingItem;
            if (type === 'debt') {
                const startDate = new Date(settings.foundationDate);
                const endDate = new Date(settings.foundationDate);
                endDate.setFullYear(endDate.getFullYear() + 3);
                
                newItem = {
                    id: uuidv4(),
                    type: 'debt',
                    source: formData.source,
                    description: formData.description,
                    amount: 0,
                    interestRate: 5,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    graceMonths: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            } else {
                newItem = {
                    id: uuidv4(),
                    type: 'equity',
                    source: formData.source,
                    description: formData.description,
                    amount: 0,
                    interestRate: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }
            setData([...data, newItem]);
        } else {
            const itemToUpdate = modalState.item!;
            setData(data.map(item => 
                item.id === itemToUpdate.id 
                ? { ...item, source: formData.source, description: formData.description, updatedAt: new Date().toISOString() } 
                : item
            ));
        }
        setModalState(null);
    }, [modalState, data, setData, settings.foundationDate]);

    const handleStartupCostChange = useCallback((field: keyof StartupCosts, value: number) => {
        setStartupCosts({ ...startupCosts, [field]: value });
    }, [startupCosts, setStartupCosts]);

    const handleConfirmDelete = useCallback(() => {
        if (deleteConfirm) {
            setData(data.filter(i => i.id !== deleteConfirm.id));
            setDeleteConfirm(null);
        }
    }, [deleteConfirm, data, setData]);

    return {
        deleteConfirm, setDeleteConfirm,
        modalState, setModalState,
        tooltip,
        handleItemHover,
        handleItemMouseLeave,
        updateItem,
        handleSaveItem,
        handleStartupCostChange,
        handleConfirmDelete
    };
};
