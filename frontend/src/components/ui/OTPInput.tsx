import type {ClipboardEvent, KeyboardEvent} from 'react';
import React, {useRef, useState} from 'react';

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
}

const OTPInput: React.FC<OTPInputProps> = ({
                                               length = 6,
                                               value,
                                               onChange,
                                               disabled = false,
                                               error,
                                           }) => {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    // Split the value into individual digits
    const digits = value.padEnd(length, ' ').split('').slice(0, length);

    const focusInput = (index: number) => {
        if (index >= 0 && index < length) {
            inputRefs.current[index]?.focus();
        }
    };

    const handleChange = (index: number, inputValue: string) => {
        if (disabled) return;

        // Only allow digits
        const digit = inputValue.replace(/\D/g, '');

        if (digit.length === 0) {
            // Handle deletion
            const newDigits = [...digits];
            newDigits[index] = ' ';
            onChange(newDigits.join('').trim());
            return;
        }

        if (digit.length === 1) {
            // Single digit input
            const newDigits = [...digits];
            newDigits[index] = digit;
            onChange(newDigits.join('').trim());

            // Move to next input
            if (index < length - 1) {
                focusInput(index + 1);
            }
        } else if (digit.length > 1) {
            // Handle paste of multiple digits
            handlePaste(digit, index);
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === 'Backspace') {
            if (digits[index] === ' ' && index > 0) {
                // If current box is empty, move to previous box and clear it
                const newDigits = [...digits];
                newDigits[index - 1] = ' ';
                onChange(newDigits.join('').trim());
                focusInput(index - 1);
            } else {
                // Clear current box
                const newDigits = [...digits];
                newDigits[index] = ' ';
                onChange(newDigits.join('').trim());
            }
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            focusInput(index - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && index < length - 1) {
            focusInput(index + 1);
            e.preventDefault();
        } else if (e.key === 'Delete') {
            const newDigits = [...digits];
            newDigits[index] = ' ';
            onChange(newDigits.join('').trim());
            e.preventDefault();
        }
    };

    const handlePaste = (pastedData: string, startIndex: number = 0) => {
        if (disabled) return;

        const digits = pastedData.replace(/\D/g, '').split('').slice(0, length - startIndex);
        const newDigits = [...value.padEnd(length, ' ').split('').slice(0, length)];

        digits.forEach((digit, i) => {
            if (startIndex + i < length) {
                newDigits[startIndex + i] = digit;
            }
        });

        onChange(newDigits.join('').trim());

        // Focus the next empty box or the last box
        const nextIndex = Math.min(startIndex + digits.length, length - 1);
        focusInput(nextIndex);
    };

    const handlePasteEvent = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        handlePaste(pastedData, index);
    };

    const handleFocus = (index: number) => {
        setFocusedIndex(index);
        // Select the content if any
        inputRefs.current[index]?.select();
    };

    const handleBlur = () => {
        setFocusedIndex(null);
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2 justify-center">
                {digits.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => {
                            inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit === ' ' ? '' : digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={(e) => handlePasteEvent(e, index)}
                        onFocus={() => handleFocus(index)}
                        onBlur={handleBlur}
                        disabled={disabled}
                        className={`
              w-12 h-14 text-center text-2xl font-semibold
              border-2 rounded-lg
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                            error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                                : focusedIndex === index
                                    ? 'border-primary-500 ring-2 ring-primary-500'
                                    : digit !== ' '
                                        ? 'border-primary-300'
                                        : 'border-gray-300'
                        }
              ${
                            disabled
                                ? 'bg-gray-100 cursor-not-allowed text-gray-400'
                                : 'bg-white hover:border-primary-400'
                        }
            `}
                        aria-label={`Digit ${index + 1}`}
                    />
                ))}
            </div>
            {error && (
                <p className="text-sm text-red-600 text-center mt-2">{error}</p>
            )}
        </div>
    );
};

export default OTPInput;
