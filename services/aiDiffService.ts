/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { formatCurrency } from '../utils.ts';
import i18n from '../i18n.ts';
import type { FinancialData, CompanySettings, PrivateNeed, OpCostCategory, OpCostCategoryKey } from '../types.ts';

export const diffFinancialData = (oldData: FinancialData, newData: FinancialData): string[] => {
    const changes: string[] = [];
    if (!newData) return [i18n.t('diff.error_no_data')];

    const formatChange = (field: string, from: unknown, to: unknown, isCurrency = false) => 
        `  - ${field}: ${from === undefined || from === null ? i18n.t('diff.n_a') : (isCurrency ? formatCurrency(from as number) : String(from))} -> ${to === undefined || to === null ? i18n.t('diff.n_a') : (isCurrency ? formatCurrency(to as number) : String(to))}`;

    const diffObjectArrays = <T extends { id: string, name?: string, source?: string, category?: string }>(
        oldArr: T[] = [], 
        newArr: T[] = [], 
        itemName: string, 
        nameKey: keyof T, 
        compareFn: (oldItem: T, newItem: T, itemChanges: string[]) => void
    ) => {
        const oldMap = new Map(oldArr.map(item => [item.id, item])); 
        const newMap = new Map(newArr.map(item => [item.id, item]));
        
        newMap.forEach((newItem, id) => {
            const oldItem = oldMap.get(id);
            if (!oldItem) {
                changes.push(i18n.t('diff.added', { item: itemName, name: String(newItem[nameKey]) }));
            } else { 
                const itemChanges: string[] = []; 
                compareFn(oldItem, newItem, itemChanges); 
                if (itemChanges.length > 0) { 
                    changes.push(i18n.t('diff.changed', { item: itemName, name: String(newItem[nameKey]) })); 
                    changes.push(...itemChanges); 
                } 
            }
        });
        
        oldMap.forEach((oldItem, id) => { 
            if (!newMap.has(id)) changes.push(i18n.t('diff.removed', { item: itemName, name: String(oldItem[nameKey]) })); 
        });
    };

    if (JSON.stringify(oldData.settings) !== JSON.stringify(newData.settings)) {
        const itemChanges: string[] = [];
        (Object.keys(oldData.settings) as Array<keyof CompanySettings>).forEach(key => { 
            if(oldData.settings[key] !== newData.settings[key]) {
                itemChanges.push(formatChange(key, oldData.settings[key], newData.settings[key])); 
            }
        });
        if (itemChanges.length > 0) {
            changes.push(`<li class="change-category">${i18n.t('diff.category_settings')}</li>`, i18n.t('diff.changed', { item: i18n.t('diff.category_settings'), name: '' }), ...itemChanges);
        }
    }

    diffObjectArrays(oldData.products, newData.products, i18n.t('diff.category_products'), "name", (o, n, c) => { 
        if (o.name !== n.name) c.push(formatChange(i18n.t('diff.field_name'), o.name, n.name)); 
        if (o.targetPrice !== n.targetPrice) c.push(formatChange(i18n.t('diff.field_price'), o.targetPrice, n.targetPrice, true)); 
        if (o.vatRate !== n.vatRate) c.push(formatChange(i18n.t('diff.field_vat'), o.vatRate, n.vatRate)); 
        if (o.materialCosts !== n.materialCosts) c.push(formatChange(i18n.t('diff.field_material_costs'), o.materialCosts, n.materialCosts, true)); 
    });

    diffObjectArrays(oldData.financing, newData.financing, i18n.t('diff.category_financing'), "source", (o, n, c) => { 
        if (o.source !== n.source) c.push(formatChange(i18n.t('diff.field_source'), o.source, n.source)); 
        if (o.amount !== n.amount) c.push(formatChange(i18n.t('diff.field_amount'), o.amount, n.amount, true)); 
        if (o.interestRate !== n.interestRate) c.push(formatChange(i18n.t('diff.field_interest'), o.interestRate, n.interestRate)); 
        if(o.startDate !== n.startDate) c.push(formatChange(i18n.t('diff.field_start_date'), o.startDate, n.startDate)); 
        if(o.endDate !== n.endDate) c.push(formatChange(i18n.t('diff.field_end_date'), o.endDate, n.endDate));
    });

    diffObjectArrays(oldData.assets, newData.assets, i18n.t('diff.category_assets'), "name", (o, n, c) => { 
        if (o.name !== n.name) c.push(formatChange(i18n.t('diff.field_name'), o.name, n.name)); 
        if (o.purchasePrice !== n.purchasePrice) c.push(formatChange(i18n.t('diff.field_purchase_cost'), o.purchasePrice, n.purchasePrice, true)); 
        if (o.usefulLifeYears !== n.usefulLifeYears) c.push(formatChange(i18n.t('diff.field_useful_life'), o.usefulLifeYears, n.usefulLifeYears)); 
        if (o.purchaseDate !== n.purchaseDate) c.push(formatChange(i18n.t('diff.field_purchase_date'), o.purchaseDate, n.purchaseDate)); 
    });

    const salesChanges: string[] = []; 
    const allProductIds = new Set([...Object.keys(oldData.sales), ...Object.keys(newData.sales)]); 
    allProductIds.forEach(id => { 
        if (JSON.stringify(oldData.sales[id] || []) !== JSON.stringify(newData.sales[id] || [])) {
            salesChanges.push(i18n.t('diff.sales_changed', { name: newData.products.find(p => String(p.id) === id)?.name || `ID ${id}` })); 
        }
    }); 
    if (salesChanges.length > 0) {
        changes.push(`<li class="change-category">${i18n.t('diff.category_sales')}</li>`, ...salesChanges);
    }

    const diffCategoryLikeObject = <T extends PrivateNeed | OpCostCategory>(oldCat: T, newCat: T, c: string[]) => {
        if (JSON.stringify(oldCat.directCosts) !== JSON.stringify(newCat.directCosts)) {
            c.push(`  - ${i18n.t('diff.direct_costs_changed')}`);
        }
        const oldSubs = oldCat.subItems || []; 
        const newSubs = newCat.subItems || []; 
        const oldSubMap = new Map(oldSubs.map(s => [s.id, s])); 
        const newSubMap = new Map(newSubs.map(s => [s.id, s]));
        
        newSubMap.forEach((newSub, id) => { 
            const oldSub = oldSubMap.get(id); 
            if (!oldSub) {
                c.push(`  - ${i18n.t('diff.subitem_added', { name: newSub.name })}`); 
            } else { 
                if (oldSub.name !== newSub.name) c.push(`  - ${i18n.t('diff.subitem_renamed', { oldName: oldSub.name, newName: newSub.name })}`); 
                if (JSON.stringify(oldSub.costs) !== JSON.stringify(newSub.costs)) c.push(`  - ${i18n.t('diff.subitem_costs_changed', { name: newSub.name })}`); 
            } 
        });
        
        oldSubMap.forEach((oldSub, id) => { 
            if (!newSubMap.has(id)) c.push(`  - ${i18n.t('diff.removed', { item: '', name: oldSub.name })}`); 
        });
    };

    diffObjectArrays(oldData.privateNeeds, newData.privateNeeds, i18n.t('diff.category_private'), "category", diffCategoryLikeObject);

    const opCostsChanges: string[] = []; 
    const opCostKeys = Object.keys(oldData.operationalCosts) as OpCostCategoryKey[]; 
    const opCostLabels: Record<OpCostCategoryKey, string> = { 
        managementSalary: i18n.t('operational_costs.ceo_salaries'), 
        personnelCosts: i18n.t('operational_costs.personnel'), 
        rentAndFacilities: i18n.t('operational_costs.facility_costs'), 
        officeSupplies: i18n.t('operational_costs.office_costs'), 
        vehicleExpenses: i18n.t('operational_costs.vehicle_costs'), 
        advertisingCosts: i18n.t('operational_costs.advertising_costs'), 
        insuranceAndFees: i18n.t('operational_costs.insurance'), 
        consultingCosts: i18n.t('operational_costs.consulting_costs'), 
        travelExpenses: i18n.t('operational_costs.travel_costs'), 
        otherOperatingExpenses: i18n.t('operational_costs.other_expenses'), 
    }; 
    
    opCostKeys.forEach(key => { 
        const oldCat = oldData.operationalCosts[key]; 
        const newCat = newData.operationalCosts[key]; 
        const itemChanges: string[] = []; 
        diffCategoryLikeObject(oldCat, newCat, itemChanges); 
        if(itemChanges.length > 0) { 
            opCostsChanges.push(`[~] ${opCostLabels[key]}:`); 
            opCostsChanges.push(...itemChanges); 
        } 
    }); 
    
    if (opCostsChanges.length > 0) {
        changes.push(`<li class="change-category">${i18n.t('diff.category_costs')}</li>`, ...opCostsChanges);
    }
    
    return changes;
};
