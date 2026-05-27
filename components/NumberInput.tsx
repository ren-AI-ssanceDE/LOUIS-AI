/**
 * @license
 * Copyright 2024 Stefan Tusk Beratung|Coaching|Training, www.ren-ai-ssance.de
 * All Rights Reserved.
 */
import React, { useState, useEffect, useRef } from 'react';
import { formatNumberForInput, parseNumberFromInput } from '../utils.ts';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'> {
    value: number | undefined | null;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

export const NumberInput = React.memo(({ value, onChange, min, max, ...props }: NumberInputProps) => {
    const [localValue, setLocalValue] = useState(() => formatNumberForInput(value));
    const isTypingRef = useRef(false);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, []);

    // Effect to sync from parent state, but only when not typing to avoid cursor jumps.
    useEffect(() => {
        if (!isTypingRef.current) {
            setLocalValue(formatNumberForInput(value));
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Regex to allow an optional minus sign, any number of digits before the separator,
        // an optional separator (comma or dot), and up to two digits after the separator.
        const regex = /^-?\d*([.,]?\d{0,2})?$/;

        // Only update if the new value is empty or matches the allowed format.
        if (inputValue === '' || regex.test(inputValue)) {
            isTypingRef.current = true;
            setLocalValue(inputValue); // Show user's valid input directly

            // Debounce the parent update
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                if (inputValue.trim() === '' || inputValue.trim() === '-') {
                    onChange(0);
                    return;
                }
                
                const numericValue = parseNumberFromInput(inputValue);
                if (!isNaN(numericValue)) {
                    onChange(numericValue);
                }
            }, 300);
        }
    };

    const handleBlur = () => {
        isTypingRef.current = false;
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        
        let numericValue = parseNumberFromInput(localValue);
        
        if (isNaN(numericValue)) {
            numericValue = min !== undefined ? min : 0;
        }

        // Round to 2 decimal places
        numericValue = Math.round((numericValue + Number.EPSILON) * 100) / 100;

        let clampedValue = numericValue;
        if (min !== undefined && clampedValue < min) clampedValue = min;
        if (max !== undefined && clampedValue > max) clampedValue = max;
        
        onChange(clampedValue);
    };

    return (
        <input
            {...props}
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            style={{ textAlign: 'right', ...props.style }}
        />
    );
});
