'use client';

type QuantitySelectorProps = {
  quantity: number;
  onQuantityChange: (qty: number) => void;
  max?: number;
};

export function QuantitySelector({ quantity, onQuantityChange, max = 99 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center border border-[#e1e3df] rounded-xl p-1 bg-[#f4f4f0] h-[56px] w-full sm:w-36">
      <button
        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="flex-1 text-xl font-medium hover:bg-white h-full rounded transition-colors disabled:opacity-40 text-[#303330]"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="flex-1 text-center font-bold text-[#303330]">{quantity}</span>
      <button
        onClick={() => onQuantityChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="flex-1 text-xl font-medium hover:bg-white h-full rounded transition-colors disabled:opacity-40 text-[#303330]"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
