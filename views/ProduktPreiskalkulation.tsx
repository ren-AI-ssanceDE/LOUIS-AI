/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon.tsx';
import type { Product, ProductCategory, FinancialData } from '../types.ts';
import { 
    CategoryModal, 
    CategorySettingsModal, 
    ProductDeleteConfirmModal, 
    CategoryDeleteConfirmModal, 
    CategoryUpdateConfirmModal 
} from '../components/produktkalkulation/ProduktPreiskalkulationModals.tsx';
import { ProductDetails } from '../components/produktkalkulation/ProduktPreiskalkulationDetails.tsx';
import { useProduktPreiskalkulation } from '../hooks/useProduktPreiskalkulation.ts';

interface ProduktPreiskalkulationProps {
    products: Product[];
    productCategories: ProductCategory[];
    onDataChange: (d: Partial<FinancialData>) => void;
}

export const ProduktPreiskalkulation = memo(({ products, productCategories, onDataChange }: ProduktPreiskalkulationProps) => {
    const { t } = useTranslation();
    const {
        activeProductId, setActiveProductId,
        activeProduct,
        deleteConfirm, setDeleteConfirm,
        selectedFilterCategoryId, setSelectedFilterCategoryId,
        setFilterCategoryId,
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
    } = useProduktPreiskalkulation({ products, productCategories, onDataChange });
    
    const selectedCategoryDescription = useMemo(() => {
        if (selectedFilterCategoryId !== 'all' && selectedFilterCategoryId !== 'none') {
            const cat = productCategories?.find(c => c.id === selectedFilterCategoryId);
            return cat?.description || cat?.name || '';
        }
        if (selectedFilterCategoryId === 'none') return t('produktkalkulation.cat_filter_none_description');
        return t('produktkalkulation.cat_filter_all_description');
    }, [selectedFilterCategoryId, productCategories, t]);

    return (
        <>
            <div className="finanzierungsplan-top-grid">
                <div className="card">
                    <h2>{t('produktkalkulation.categories_title')}</h2>
                    <div className="tooltip-wrapper" data-tooltip={selectedCategoryDescription} style={{display: 'block'}}>
                       <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                           <div className="persona-selection-controls">
                                <select 
                                    value={selectedFilterCategoryId} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSelectedFilterCategoryId(val === 'all' || val === 'none' ? val : val);
                                    }}
                                >
                                    <option value="all">{t('produktkalkulation.filter_all')}</option>
                                    <option value="none">{t('produktkalkulation.filter_none')}</option>
                                    {(productCategories || []).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <button
                                    className="btn-icon-square"
                                    onClick={() => setFilterCategoryId(selectedFilterCategoryId)}
                                    title={t('produktkalkulation.filter_apply')}
                                >
                                    <Icon icon="filter" size={16} />
                                </button>
                                <button
                                    className="btn-icon-square"
                                    disabled={selectedFilterCategoryId === 'all' || selectedFilterCategoryId === 'none'}
                                    onClick={() => {
                                        const category = (productCategories || []).find(c => c.id === selectedFilterCategoryId);
                                        if (category) setCategoryModalState({ mode: 'edit', category });
                                    }}
                                    title={t('produktkalkulation.category_edit')}
                                >
                                    <Icon icon="edit" size={16} />
                                </button>
                                 <button
                                    className="btn-icon-primary"
                                    onClick={() => setCategoryModalState({ mode: 'add' })}
                                    title={t('produktkalkulation.category_add')}
                                >
                                    <Icon icon="plus" size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                       </div>
                    </div>
                </div>
                 <div className="card">
                    <h2>{t('produktkalkulation.category_settings_title')}</h2>
                     <div className="form-group" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                           <div className="persona-selection-controls">
                                <select 
                                    value={selectedCategoryIdForSettings}
                                    onChange={e => setSelectedCategoryIdForSettings(e.target.value)}
                                >
                                    <option value="" disabled>{t('produktkalkulation.category_select')}</option>
                                    {(productCategories || []).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                <button
                                    className="btn-icon-square"
                                    disabled={!selectedCategoryIdForSettings}
                                    onClick={() => {
                                        const category = (productCategories || []).find(c => c.id === selectedCategoryIdForSettings);
                                        if (category) setCategorySettingsModalState(category);
                                    }}
                                    title={t('produktkalkulation.category_edit')}
                                >
                                    <Icon icon="edit" size={16} />
                                </button>
                            </div>
                           <p className="help-text" style={{marginTop: '1rem'}}>{t('produktkalkulation.category_settings_hint')}</p>
                       </div>
                </div>
            </div>
            <div className="card" style={{ marginTop: '2rem' }}>
                {deleteConfirm && (
                    <ProductDeleteConfirmModal 
                        productName={deleteConfirm.name}
                        onConfirm={handleConfirmDelete}
                        onCancel={() => setDeleteConfirm(null)}
                    />
                )}
                {categoryToDelete && (
                    <CategoryDeleteConfirmModal 
                        categoryName={categoryToDelete.name}
                        onConfirm={handleDeleteCategory}
                        onCancel={() => setCategoryToDelete(null)}
                    />
                )}
                {confirmCategoryUpdateState && (
                    <CategoryUpdateConfirmModal 
                        categoryName={confirmCategoryUpdateState.category.name}
                        onConfirm={handleConfirmCategorySettingsUpdate}
                        onCancel={() => setConfirmCategoryUpdateState(null)}
                    />
                )}
                {categoryModalState && (
                    <CategoryModal
                        modalState={categoryModalState}
                        onClose={() => setCategoryModalState(null)}
                        onSave={handleSaveCategory}
                        onDeleteRequest={(category) => {
                            setCategoryModalState(null);
                            setCategoryToDelete(category);
                        }}
                    />
                )}
                {categorySettingsModalState && (
                    <CategorySettingsModal
                        category={categorySettingsModalState}
                        onClose={() => setCategorySettingsModalState(null)}
                        onSave={handleSaveCategorySettings}
                    />
                )}
                <h2>{t('produktkalkulation.revenue_calc_title')}</h2>
                <div className="view-header-with-controls">
                    <div className="tabs-container">
                        {filteredProducts.map(p => (
                            <div key={p.id} className={`tab ${p.id === activeProductId ? 'active' : ''}`} onClick={() => setActiveProductId(p.id)}>
                                <input type="text" value={p.name} onChange={e => updateProductField(p.id, 'name', e.target.value)} onClick={(e) => { e.stopPropagation(); setActiveProductId(p.id); }} className="tab-input" />
                                <button className="btn-icon-danger" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p); }} title={t('common.delete')}>
                                    <Icon icon="trash" size={16} />
                                </button>
                            </div>
                        ))}
                        <button
                            className="btn-icon-primary"
                            onClick={addItem}
                            title={t('produktkalkulation.add_unit')}
                            style={{ marginLeft: '8px' }}
                        >
                            <Icon icon="plus" size={18} strokeWidth="2.5" />
                        </button>
                    </div>
                </div>
                <div className="tab-content">
                    {activeProduct ? (
                        <ProductDetails 
                            product={activeProduct}
                            categorySettings={categorySettingsForActiveProduct}
                            onUpdateField={updateProductField}
                            onWareneinsatzChange={handleWareneinsatzChange}
                            productCategories={productCategories}
                        />
                    ) : (
                        <p>{t('produktkalkulation.no_unit_selected')}</p>
                    )}
                </div>
            </div>
        </>
    );
});
