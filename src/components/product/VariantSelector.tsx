'use client';

import { useState } from 'react';
import type { ShopifyProductOption, ShopifyProductVariant } from '@/lib/shopify/types';

type VariantSelectorProps = {
  options: ShopifyProductOption[];
  variants: ShopifyProductVariant[];
  onVariantChange: (variant: ShopifyProductVariant) => void;
};

export function VariantSelector({ options, variants, onVariantChange }: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    options.forEach((opt) => {
      initial[opt.name] = opt.values[0];
    });
    return initial;
  });

  function handleSelect(optionName: string, value: string) {
    const newOptions = { ...selectedOptions, [optionName]: value };
    setSelectedOptions(newOptions);

    // Find matching variant
    const matchingVariant = variants.find((v) =>
      v.selectedOptions.every((so) => newOptions[so.name] === so.value)
    );
    if (matchingVariant) {
      onVariantChange(matchingVariant);
    }
  }

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <div key={option.id}>
          <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
            {option.name}:{' '}
            <span className="font-normal text-[var(--color-text-secondary)]">
              {selectedOptions[option.name]}
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selectedOptions[option.name] === value;
              // Check if this option combination leads to an available variant
              const testOptions = { ...selectedOptions, [option.name]: value };
              const matchingVariant = variants.find((v) =>
                v.selectedOptions.every((so) => testOptions[so.name] === so.value)
              );
              const isAvailable = matchingVariant?.availableForSale !== false;

              return (
                <button
                  key={value}
                  onClick={() => handleSelect(option.name, value)}
                  disabled={!isAvailable}
                  className={[
                    'min-w-[40px] rounded-[var(--radius-md)] border px-3 py-1.5 text-sm font-medium transition-all',
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                      : 'border-gray-300 bg-white text-[var(--color-text-primary)] hover:border-[var(--color-primary)]',
                    !isAvailable
                      ? 'opacity-40 cursor-not-allowed line-through'
                      : 'cursor-pointer',
                  ].join(' ')}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
