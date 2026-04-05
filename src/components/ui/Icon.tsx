type IconProps = {
  name: string;
  filled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-3xl',
};

export function Icon({ name, filled = false, size = 'md', className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${sizeMap[size]} leading-none${className ? ` ${className}` : ''}`}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : { fontVariationSettings: "'FILL' 0" }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
