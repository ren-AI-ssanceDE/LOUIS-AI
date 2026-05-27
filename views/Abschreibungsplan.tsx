/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { formatCurrency } from '../utils.ts';
import { NumberInput } from '../components/NumberInput.tsx';
import { Icon } from '../components/Icon.tsx';
import type { Asset, CompanySettings } from '../types.ts';
import { AssetModal, DeleteAssetConfirmModal } from '../components/abschreibungsplan/AbschreibungsplanModals.tsx';

interface AbschreibungsplanProps {
    assets: Asset[];
    onAssetsChange: (d: Asset[]) => void;
    settings: CompanySettings;
    afaData: { name: string; life: number }[];
}

export const Abschreibungsplan = memo(({ assets, onAssetsChange, settings, afaData }: AbschreibungsplanProps) => {
    const { t } = useTranslation();
    const [deleteConfirm, setDeleteConfirm] = useState<Asset | null>(null);
    const [modalState, setModalState] = useState<{ mode: 'add' | 'edit', item?: Asset } | null>(null);
    const [tooltip, setTooltip] = useState<{ x: number, y: number, content: string } | null>(null);

    const handleAssetChange = (id: string, field: keyof Asset, value: any) => {
        onAssetsChange(assets.map(asset => {
            if (asset.id !== id) return asset;
            const updated = { ...asset };
            (updated as any)[field] = value;

            if (field === 'depreciationCategory') {
                const selectedAfa = afaData.find(d => d.name === value);
                if (selectedAfa) {
                    updated.usefulLifeYears = selectedAfa.life;
                }
            }
            return updated as Asset;
        }));
    };

    const handleSaveAsset = (formData: { name: string, description: string }) => {
        if (!modalState) return;

        if (modalState.mode === 'add') {
             const newAsset: Asset = {
                id: uuidv4(),
                name: formData.name,
                description: formData.description,
                purchasePrice: 0,
                usefulLifeYears: 1,
                purchaseDate: settings.foundationDate,
                depreciationCategory: afaData.length > 0 ? afaData[0].name : 'Sonstiges',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            onAssetsChange([...assets, newAsset]);
        } else { // 'edit'
             const itemToUpdate = modalState.item!;
             onAssetsChange(assets.map(asset =>
                asset.id === itemToUpdate.id
                ? { ...asset, name: formData.name, description: formData.description, updatedAt: new Date().toISOString() }
                : asset
            ));
        }
        setModalState(null);
    };

    const removeAsset = (id: string) => {
        onAssetsChange(assets.filter(asset => asset.id !== id));
    };

    const handleConfirmDelete = () => {
        if (deleteConfirm) {
            removeAsset(deleteConfirm.id);
            setDeleteConfirm(null);
        }
    };

    const handleItemHover = (e: React.MouseEvent, description?: string) => {
        if (description && description.trim()) {
            setTooltip({ x: e.clientX, y: e.clientY, content: description });
        }
    };

    const handleItemMouseLeave = () => {
        setTooltip(null);
    };


    const totalInvestment = assets.reduce((sum, asset) => sum + asset.purchasePrice, 0);

    return (
        <div className="card">
            {tooltip && (
                <div
                    className="product-description-tooltip visible"
                    style={{
                        top: tooltip.y,
                        left: tooltip.x,
                    }}
                >
                    {tooltip.content}
                </div>
            )}
            {modalState && (
                <AssetModal
                    item={modalState.item}
                    onClose={() => setModalState(null)}
                    onSave={handleSaveAsset}
                    onDeleteRequest={(item) => {
                        setModalState(null);
                        setDeleteConfirm(item);
                    }}
                />
            )}
            {deleteConfirm && (
                <DeleteAssetConfirmModal 
                    itemName={deleteConfirm.name}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
            <h2>{t('abschreibungsplan.title')}</h2>
            <div className="table-container">
                <table>
                    <thead className="sticky-header">
                        <tr>
                            <th className="sticky-col">{t('abschreibungsplan.asset')}</th>
                            <th>{t('abschreibungsplan.costs')}</th>
                            <th>{t('abschreibungsplan.afa_category')}</th>
                            <th>{t('abschreibungsplan.useful_life')}</th>
                            <th>{t('abschreibungsplan.purchase_date')}</th>
                            <th>{t('abschreibungsplan.annual_afa')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map(asset => (
                            <tr key={asset.id}>
                                <td className="sticky-col">
                                     <div className="opcost-label-content">
                                        <button className="btn-icon-square" onClick={() => setModalState({ mode: 'edit', item: asset })} title={t('common.edit')}>
                                            <Icon icon="edit" size={16} />
                                        </button>
                                        <div
                                            className="row-header"
                                            style={{ flexGrow: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '0.5rem' }}
                                            onMouseMove={(e) => handleItemHover(e, asset.description)}
                                            onMouseLeave={handleItemMouseLeave}
                                        >
                                           {asset.name}
                                        </div>
                                     </div>
                                </td>
                                <td className="input-cell">
                                    <NumberInput value={asset.purchasePrice} onChange={num => handleAssetChange(asset.id, 'purchasePrice', num)} min={0} />
                                </td>
                                <td className="input-cell">
                                    <select value={asset.depreciationCategory} onChange={e => handleAssetChange(asset.id, 'depreciationCategory', e.target.value)}>
                                        {afaData.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
                                    </select>
                                </td>
                                <td className="input-cell">
                                     <NumberInput value={asset.usefulLifeYears} onChange={num => handleAssetChange(asset.id, 'usefulLifeYears', Math.round(num))} min={1} />
                                </td>
                                <td className="input-cell">
                                    <input type="date" value={asset.purchaseDate} onChange={e => handleAssetChange(asset.id, 'purchaseDate', e.target.value)} />
                                </td>
                                <td className="input-cell disabled">
                                    <span>{formatCurrency(asset.usefulLifeYears > 0 ? asset.purchasePrice / asset.usefulLifeYears : 0)}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="add-item-row">
                            <td colSpan={6}>
                                <button className="btn-icon-primary" onClick={() => setModalState({ mode: 'add' })} title={t('abschreibungsplan.add_asset')}>
                                    <Icon icon="plus" size={18} strokeWidth="2.5" />
                                </button>
                            </td>
                        </tr>
                        <tr className="total-row">
                            <td className="sticky-col"><div className="row-header">{t('abschreibungsplan.total_investment')}</div></td>
                            <td className="input-cell disabled"><span>{formatCurrency(totalInvestment)}</span></td>
                            <td colSpan={4}></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
});
