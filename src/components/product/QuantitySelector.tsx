'use client';

type QuantitySelectorProps = {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  max?: number;
};

export function QuantitySelector({ quantity, onQuantityChange, max = 99 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center border border-slate-200 rounded-lg p-1 bg-[#F8F9FC] h-[56px] w-full sm:w-36">
      <button
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="flex-1 text-xl font-medium hover:bg-white h-full rounded transition-colors disabled:opacity-40 text-[#1A1A2E]"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="flex-1 text-center font-bold text-[#1A1A2E]">{quantity}</span>
      <button
        onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="flex-1 text-xl font-medium hover:bg-white h-full rounded transition-colors disabled:opacity-40 text-[#1A1A2E]"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
