/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Product, ProductCategory, FinancialData } from '../types.ts';

interface UseProduktPreiskalkulationProps {
    products: Product[];
    productCategories: ProductCategory[];
    onDataChange: (d: Partial<FinancialData>) => void;
}

export const useProduktPreiskalkulation = ({ products, productCategories, onDataChange }: UseProduktPreiskalkulationProps) => {
    const [activeProductId, setActiveProductId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
    const [selectedFilterCategoryId, setSelectedFilterCategoryId] = useState<string | 'all' | 'none'>('all');
    const [filterCategoryId, setFilterCategoryId] = useState<string | 'all' | 'none'>('all');
    const [categoryModalState, setCategoryModalState] = useState<{ mode: 'add' | 'edit', category?: ProductCategory } | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
    const [selectedCategoryIdForSettings, setSelectedCategoryIdForSettings] = useState<string | ''>('');
    const [categorySettingsModalState, setCategorySettingsModalState] = useState<ProductCategory | null>(null);
    const [confirmCategoryUpdateState, setConfirmCategoryUpdateState] = useState<{ category: ProductCategory; newSettings: Partial<ProductCategory> } | null>(null);

    const filteredProducts = useMemo(() => {
        if (filterCategoryId === 'all') return products;
        if (filterCategoryId === 'none') return products.filter(p => p.categoryId === undefined || p.categoryId === null);
        return products.filter(p => p.categoryId === filterCategoryId);
    }, [products, filterCategoryId]);

    useEffect(() => {
        const currentActiveProductIsVisible = filteredProducts.some(p => p.id === activeProductId);
        if (!currentActiveProductIsVisible) {
            setActiveProductId(filteredProducts.length > 0 ? filteredProducts[0].id : null);
        }
    }, [filteredProducts, activeProductId]);

    const activeProduct = useMemo(() => products.find(p => p.id === activeProductId), [products, activeProductId]);
    
    const categorySettingsForActiveProduct = useMemo(() => {
        if (!activeProduct?.categoryId) return undefined;
        return (productCategories || []).find(c => c.id === activeProduct.categoryId);
    }, [productCategories, activeProduct]);

    const updateProductField = useCallback(<K extends keyof Product>(id: string, field: K, value: Product[K]) => {
        const newProducts = products.map(p => {
            if (p.id !== id) return p;
            const updatedProduct = { ...p };
            
            if (field === 'categoryId') {
                const newCategoryId = value ? String(value) : undefined;
                updatedProduct.categoryId = newCategoryId;
                const newCategory = productCategories.find(c => c.id === newCategoryId);
                if (newCategory) {
                    if (newCategory.cogsPercentage !== undefined) {
                        updatedProduct.materialCosts = 0;
                        updatedProduct.productionCosts = 0;
                        updatedProduct.adminCosts = 0;
                        updatedProduct.marketingSalesCosts = 0;
                        updatedProduct.marginPercentage = 0;
                        updatedProduct.otherCosts = updatedProduct.targetPrice * (newCategory.cogsPercentage / 100);
                    }
                    if (newCategory.revenueDelayWeeks !== undefined) updatedProduct.revenueDelayWeeks = newCategory.revenueDelayWeeks;
                    if (newCategory.reservePercentage !== undefined) updatedProduct.reservePercentage = newCategory.reservePercentage;
                    if (newCategory.reserveDelayWeeks !== undefined) updatedProduct.reserveDelayWeeks = newCategory.reserveDelayWeeks;
                }
            } else {
                (updatedProduct as Product)[field] = value;
                if (field === 'targetPrice') {
                    const targetPriceValue = Number(value);
                    const category = productCategories.find(c => c.id === p.categoryId);
                    if (category?.cogsPercentage !== undefined) {
                        updatedProduct.materialCosts = 0;
                        updatedProduct.productionCosts = 0;
                        updatedProduct.adminCosts = 0;
                        updatedProduct.marketingSalesCosts = 0;
                        updatedProduct.marginPercentage = 0;
                        updatedProduct.otherCosts = targetPriceValue * (category.cogsPercentage / 100);
                    }
                }
            }
            return updatedProduct;
        });
        onDataChange({ products: newProducts });
    }, [products, productCategories, onDataChange]);

    const handleWareneinsatzChange = useCallback((id: string, newPercent: number) => {
        const newProducts = products.map(p => (p.id === id && p.targetPrice > 0) ? { ...p, materialCosts: 0, productionCosts: 0, adminCosts: 0, marketingSalesCosts: 0, marginPercentage: 0, otherCosts: p.targetPrice * (newPercent / 100) } : p);
        onDataChange({ products: newProducts });
    }, [products, onDataChange]);
    
    const addItem = useCallback(() => {
        const newItem: Product = { id: uuidv4(), name: 'Neues Produkt', description: '', targetPrice: 0, vatRate: 19, materialCosts: 0, productionCosts: 0, adminCosts: 0, marketingSalesCosts: 0, marginPercentage: 0, otherCosts: 0, revenueDelayWeeks: 0, reservePercentage: 0, reserveDelayWeeks: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const newProducts = [...products, newItem];
        onDataChange({ products: newProducts });
        setActiveProductId(newItem.id);
        setFilterCategoryId('all');
        setSelectedFilterCategoryId('all');
    }, [products, onDataChange]);

    const deleteItem = useCallback((idToDelete: string) => {
        const productIndex = products.findIndex(p => p.id === idToDelete);
        const newProducts = products.filter(p => p.id !== idToDelete);
        onDataChange({ products: newProducts });
        if (activeProductId === idToDelete) setActiveProductId(newProducts.length > 0 ? newProducts[Math.max(0, productIndex - 1)].id : null);
    }, [products, activeProductId, onDataChange]);

    const handleConfirmDelete = useCallback(() => {
        if (deleteConfirm) {
            deleteItem(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    }, [deleteConfirm, deleteItem]);

    const handleSaveCategory = useCallback((mode: 'add' | 'edit', formData: { name: string, description: string }, id?: string) => {
        const currentCategories = productCategories || [];
        if (mode === 'add') {
            const newCategory: ProductCategory = { id: uuidv4(), ...formData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            onDataChange({ productCategories: [...currentCategories, newCategory] });
        } else {
            const updatedCategories = currentCategories.map(c => c.id === id ? { ...c, ...formData, updatedAt: new Date().toISOString() } : c);
            onDataChange({ productCategories: updatedCategories });
        }
        setCategoryModalState(null);
    }, [productCategories, onDataChange]);

    const handleDeleteCategory = useCallback(() => {
        if (!categoryToDelete) return;
        const newCategories = (productCategories || []).filter(c => c.id !== categoryToDelete.id);
        const updatedProducts = products.map(p => {
            if (p.categoryId === categoryToDelete.id) return { ...p, categoryId: undefined };
            return p;
        });
        onDataChange({ productCategories: newCategories, products: updatedProducts });
        if (filterCategoryId === categoryToDelete.id) setFilterCategoryId('all');
        if (selectedFilterCategoryId === categoryToDelete.id) setSelectedFilterCategoryId('all');
        setCategoryToDelete(null);
    }, [categoryToDelete, productCategories, products, filterCategoryId, selectedFilterCategoryId, onDataChange]);
    
    const handleSaveCategorySettings = useCallback((newSettings: Partial<ProductCategory>) => {
        if (!categorySettingsModalState) return;
        setCategorySettingsModalState(null);
        setConfirmCategoryUpdateState({ category: categorySettingsModalState, newSettings });
    }, [categorySettingsModalState]);

    const handleConfirmCategorySettingsUpdate = useCallback(() => {
        if (!confirmCategoryUpdateState) return;
        const { category, newSettings } = confirmCategoryUpdateState;
        const updatedCategories = (productCategories || []).map(c => c.id === category.id ? { ...c, ...newSettings } : c);
        const updatedProducts = products.map(p => {
            if (p.categoryId !== category.id) return p;
            const updatedProduct = { ...p };
            if (newSettings.cogsPercentage !== undefined) {
                updatedProduct.materialCosts = 0;
                updatedProduct.productionCosts = 0;
                updatedProduct.adminCosts = 0;
                updatedProduct.marketingSalesCosts = 0;
                updatedProduct.marginPercentage = 0;
                updatedProduct.otherCosts = p.targetPrice * (newSettings.cogsPercentage / 100);
            }
            if (newSettings.revenueDelayWeeks !== undefined) updatedProduct.revenueDelayWeeks = newSettings.revenueDelayWeeks;
            if (newSettings.reservePercentage !== undefined) updatedProduct.reservePercentage = newSettings.reservePercentage;
            if (newSettings.reserveDelayWeeks !== undefined) updatedProduct.reserveDelayWeeks = newSettings.reserveDelayWeeks;
            return updatedProduct;
        });
        onDataChange({ productCategories: updatedCategories, products: updatedProducts });
        setConfirmCategoryUpdateState(null);
    }, [confirmCategoryUpdateState, productCategories, products, onDataChange]);

    return {
        activeProductId, setActiveProductId,
        activeProduct,
        deleteConfirm, setDeleteConfirm,
        selectedFilterCategoryId, setSelectedFilterCategoryId,
        filterCategoryId, setFilterCategoryId,
        categoryModalState, setCategoryModalState,
        categoryToDelete, setCategoryToDelete,
        selectedCategoryIdForSettings, setSelectedCategoryIdForSettings,
        categorySettingsModalState, setCategorySettingsModalState,
        confirmCategoryUpdateState, setConfirmCategoryUpdateState,
        filteredProducts,
        categorySettingsForActiveProduct,
        updateProductField,
        handleWareneinsatzChange,
        addItem,
        handleConfirmDelete,
        handleSaveCategory,
        handleDeleteCategory,
        handleSaveCategorySettings,
        handleConfirmCategorySettingsUpdate,
    };
};
