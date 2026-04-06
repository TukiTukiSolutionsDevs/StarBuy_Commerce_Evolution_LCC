'use client';

/**
 * SuggestedPrompts — Contextual prompt suggestions
 *
 * Shows categorized chips when the chat is in its initial empty state.
 * Click any chip to fill and submit the chat input.
 */

// ─── Data ────────────────────────────────────────────────────────────────────────

type PromptCategory = {
  label: string;
  icon: string;
  color: string;
  prompts: string[];
};

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    label: 'Products',
    icon: 'inventory_2',
    color: '#d4a843',
    prompts: [
      'Show me all products with low stock',
      'What products need better descriptions?',
      'Create a new product',
    ],
  },
  {
    label: 'Orders',
    icon: 'receipt_long',
    color: '#10b981',
    prompts: ['Show unfulfilled orders', 'Revenue this week', 'Process fulfillment for order #'],
  },
  {
    label: 'Customers',
    icon: 'people',
    color: '#6b8cff',
    prompts: ['Who are my top customers?', 'New customers this month', 'Tag VIP customers'],
  },
  {
    label: 'Analytics',
    icon: 'insights',
    color: '#8b5cf6',
    prompts: [
      'Revenue report this month',
      'What is my average order value?',
      'Top 5 selling products',
    ],
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────────

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────────

export default function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center px-3 py-4 gap-4 w-full">
      {/* Header */}
      <div className="text-center mb-1">
        <span className="material-symbols-outlined text-[#d4a843] text-4xl mb-2 block">
          smart_toy
        </span>
        <p
          className="text-white font-semibold text-sm"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          AI Store Assistant
        </p>
        <p className="text-[#6b7280] text-xs leading-relaxed mt-1">
          Ask me anything or pick a suggestion below
        </p>
      </div>

      {/* Categories grid */}
      <div className="w-full space-y-3">
        {PROMPT_CATEGORIES.map((category) => (
          <div key={category.label}>
            {/* Category label */}
            <div
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-0.5"
              style={{ color: category.color }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '13px', color: category.color }}
              >
                {category.icon}
              </span>
              {category.label}
            </div>

            {/* Prompt chips */}
            <div className="flex flex-col gap-1.5">
              {category.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSelectPrompt(prompt)}
                  className="
                    group w-full text-left
                    bg-[#0f1729] hover:bg-[#111827]
                    border border-[#1f2d4e] hover:border-[#2d3f6e]
                    rounded-lg px-3 py-2
                    text-[11px] text-[#9ca3af] hover:text-[#e5e7eb]
                    transition-all duration-150
                    flex items-center justify-between gap-2
                  "
                >
                  <span className="flex-1 leading-snug">{prompt}</span>
                  <span
                    className="
                      material-symbols-outlined text-[11px] flex-none opacity-0
                      group-hover:opacity-100 transition-opacity
                    "
                    style={{ color: category.color }}
                  >
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
