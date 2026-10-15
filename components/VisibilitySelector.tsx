'use client';

import { Globe, Lock } from 'lucide-react';

const VISIBILITY_OPTIONS = [
    { value: false, label: 'Private', description: 'Only you can see and talk to this book', Icon: Lock },
    { value: true, label: 'Public', description: 'Everyone can find it in the Public Library', Icon: Globe },
];

interface VisibilitySelectorProps {
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

const VisibilitySelector = ({ value, onChange, disabled }: VisibilitySelectorProps) => (
    <div className="voice-selector-options" role="radiogroup" aria-label="Book visibility">
        {VISIBILITY_OPTIONS.map(({ value: optionValue, label, description, Icon }) => {
            const isSelected = value === optionValue;
            return (
                <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={disabled}
                    onClick={() => onChange(optionValue)}
                    className={`voice-selector-option ${isSelected ? 'voice-selector-option-selected' : 'voice-selector-option-default'} ${disabled ? 'voice-selector-option-disabled' : ''}`}
                >
                    <div className="flex flex-col gap-1 text-left">
                        <span className="flex items-center gap-2 font-bold text-(--text-primary)">
                            <Icon className="size-4" aria-hidden="true" />
                            {label}
                        </span>
                        <span className="text-xs text-(--text-secondary) leading-relaxed">{description}</span>
                    </div>
                </button>
            );
        })}
    </div>
);

export default VisibilitySelector;
