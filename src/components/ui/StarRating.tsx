type StarRatingProps = {
  rating?: number;
  count?: number;
  className?: string;
};

export function StarRating({ rating = 4.5, count, className = '' }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div
      className={['flex items-center gap-1', className].filter(Boolean).join(' ')}
      aria-label={`Rating: ${rating} out of 5${count ? `, ${count} reviews` : ''}`}
    >
      <div className="flex items-center text-[var(--color-secondary)]">
        {Array.from({ length: fullStars }).map((_, i) => (
          <span
            key={`full-${i}`}
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            star
          </span>
        ))}
        {hasHalf && (
          <span
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            star_half
          </span>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span
            key={`empty-${i}`}
            className="material-symbols-outlined text-sm"
            style={{ fontVariationSettings: "'FILL' 0" }}
            aria-hidden="true"
          >
            star
          </span>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs text-slate-400 font-medium ml-1">({count})</span>
      )}
    </div>
  );
}
