/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */

import { useMemo } from 'react';
import { calculateFinancials } from '../services/calculationService.ts';
import type { FinancialData } from '../types.ts';

export const useFinancialCalculations = (data: FinancialData | null) => {
    return useMemo(() => calculateFinancials(data), [data]);
};