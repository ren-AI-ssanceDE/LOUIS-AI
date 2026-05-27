/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useCallback } from 'react';
import { createYearlyArray } from '../utils.ts';
import type { SalesData } from '../types.ts';

interface UseAbsatzplanProps {
    sales: SalesData;
    setSales: (d: SalesData) => void;
    planningYears: number;
}

export const useAbsatzplan = ({ sales, setSales, planningYears }: UseAbsatzplanProps) => {
    const [resetConfirm, setResetConfirm] = useState<number | null>(null);
    const [applyToYearsConfirm, setApplyToYearsConfirm] = useState<number | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

    const handleProductHover = useCallback((e: React.MouseEvent, description: string) => {
        if (description && description.trim()) {
            setTooltip({
                x: e.clientX + 10,
                y: e.clientY + 10,
                content: description,
            });
        } else {
            setTooltip(null);
        }
    }, []);

    const handleProductMouseLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    const handleQuantityChange = useCallback((productId: string, year: number, month: number, value: number) => {
        const finalValue = Math.round(value); 

        const newSalesData = { ...sales };
        if (!newSalesData[productId]) {
            newSalesData[productId] = createYearlyArray(planningYears, 0);
        }
        
        const newYearData = [...newSalesData[productId][year]];
        newYearData[month] = finalValue;

        const newProductSales = [...newSalesData[productId]];
        newProductSales[year] = newYearData;

        newSalesData[productId] = newProductSales;
        setSales(newSalesData);
    }, [sales, planningYears, setSales]);
    
    const handleFillForward = useCallback((productId: string, year: number, month: number) => {
        const newSalesData = { ...sales };
        if (!newSalesData[productId]?.[year]) {
            return;
        }

        const valueToCopy = newSalesData[productId][year][month] ?? 0;
        
        newSalesData[productId] = newSalesData[productId].map((y, yIdx) => {
            if (yIdx !== year) return [...y];
            return y.map((mValue, mIdx) => mIdx > month ? valueToCopy : mValue);
        });
        
        setSales(newSalesData);
    }, [sales, setSales]);

    const performResetYear = useCallback((yearIndex: number) => {
        const newSalesData = { ...sales };
        for (const productId in newSalesData) {
            if (Object.prototype.hasOwnProperty.call(newSalesData, productId)) {
                const productSales = [...newSalesData[productId]];
                if (productSales[yearIndex]) {
                    productSales[yearIndex] = Array(12).fill(0);
                    newSalesData[productId] = productSales;
                }
            }
        }
        setSales(newSalesData);
        setResetConfirm(null);
    }, [sales, setSales]);

    const performApplyToYears = useCallback((sourceYear: number, targetYears: number[]) => {
        const newSalesData = { ...sales };
        for (const productId in newSalesData) {
            if (Object.prototype.hasOwnProperty.call(newSalesData, productId)) {
                const productSales = [...newSalesData[productId]];
                const sourceData = productSales[sourceYear];
                if (sourceData) {
                    targetYears.forEach(yIdx => {
                        if (productSales[yIdx]) {
                            productSales[yIdx] = [...sourceData];
                        }
                    });
                    newSalesData[productId] = productSales;
                }
            }
        }
        setSales(newSalesData);
        setApplyToYearsConfirm(null);
    }, [sales, setSales]);

    return {
        resetConfirm, setResetConfirm,
        applyToYearsConfirm, setApplyToYearsConfirm,
        tooltip,
        handleProductHover,
        handleProductMouseLeave,
        handleQuantityChange,
        handleFillForward,
        performResetYear,
        performApplyToYears
    };
};
