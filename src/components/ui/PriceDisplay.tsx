type PriceDisplayProps = {
  price: { amount: string; currencyCode: string };
  compareAtPrice?: { amount: string; currencyCode: string } | null;
  className?: string;
};

function formatMoney(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(parseFloat(amount));
}

export function PriceDisplay({ price, compareAtPrice, className = '' }: PriceDisplayProps) {
  const hasDiscount =
    compareAtPrice && parseFloat(compareAtPrice.amount) > parseFloat(price.amount);

  const discountPercent = hasDiscount
    ? Math.round(
        ((parseFloat(compareAtPrice!.amount) - parseFloat(price.amount)) /
          parseFloat(compareAtPrice!.amount)) *
          100,
      )
    : 0;

  return (
    <div className={['flex items-center gap-2', className].filter(Boolean).join(' ')}>
      <span
        className={['font-semibold', hasDiscount ? 'text-[#ac3149]' : 'text-[#795a00]'].join(' ')}
      >
        {formatMoney(price.amount, price.currencyCode)}
      </span>

      {hasDiscount && (
        <>
          <span className="text-sm text-[#b1b2af] line-through">
            {formatMoney(compareAtPrice!.amount, compareAtPrice!.currencyCode)}
          </span>
          <span className="text-xs font-semibold text-[var(--color-error)]">
            -{discountPercent}%
          </span>
        </>
      )}
    </div>
  );
}
