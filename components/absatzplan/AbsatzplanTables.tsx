/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import { memo } from 'react';
import { MONTHS } from '../../constants.ts';
import { Icon } from '../Icon.tsx';
import { NumberInput } from '../NumberInput.tsx';
import { useTranslation } from 'react-i18next';
import type { Product } from '../../types.ts';

interface AbsatzplanTableProps {
    year: number;
    visibleMonths: number[];
    products: Product[];
    sales: Record<string, number[][]>;
    handleFillForward: (productId: string, year: number, month: number) => void;
    handleQuantityChange: (productId: string, year: number, month: number, value: number) => void;
    handleProductHover: (e: React.MouseEvent, description: string) => void;
    handleProductMouseLeave: () => void;
    foundationMonth: number;
}

export const AbsatzplanTable = memo(({
    year, visibleMonths, products, sales,
    handleFillForward, handleQuantityChange,
    handleProductHover, handleProductMouseLeave,
    foundationMonth
}: AbsatzplanTableProps) => {
    const { t } = useTranslation();
    const isShortYear = year === 0 && visibleMonths.length < 12;

    return (
        <div className={`table-container ${isShortYear ? 'table-container-fit-content' : ''}`}>
            <table>
                <thead className="sticky-header">
                    <tr>
                        <th className="sticky-col"><div className="row-header">{t('common.product')}</div></th>
                        {visibleMonths.map(m => (
                            <th key={m}>{t(`months.${m}`, { defaultValue: MONTHS[m] })}</th>
                        ))}
                        <th>{t('common.total')}</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id}>
                            <td 
                                className="sticky-col"
                                onMouseEnter={(e) => handleProductHover(e, p.description)}
                                onMouseLeave={handleProductMouseLeave}
                            >
                                <div className="row-header">{p.name}</div>
                            </td>
                            {visibleMonths.map((month) => (
                                <td key={month} className="input-cell">
                                    <div className="input-cell-content with-fill-forward">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleFillForward(p.id, year, month); }} 
                                            title={t('absatzplan.fill_forward_hint')} 
                                            className="btn-fill-forward"
                                            type="button"
                                        >
                                            <Icon icon="fill-forward" size={16} />
                                        </button>
                                        <NumberInput
                                            value={sales[p.id]?.[year]?.[month]}
                                            onChange={newValue => handleQuantityChange(p.id, year, month, newValue)}
                                            min={0}
                                        />
                                    </div>
                                </td>
                            ))}
                            <td className="total-col">
                                <span>
                                {
                                    (sales[p.id]?.[year] || []).reduce((total, quantity, month) => {
                                        const isInactive = year === 0 && month < foundationMonth;
                                        return isInactive ? total : total + (quantity || 0);
                                    }, 0)
                                }
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});
