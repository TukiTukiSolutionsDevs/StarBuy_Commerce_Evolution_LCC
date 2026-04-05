import { type HTMLAttributes } from 'react';

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  as?: 'div' | 'section' | 'main' | 'article' | 'aside';
  narrow?: boolean;
};

export function Container({
  children,
  className = '',
  as: Tag = 'div',
  narrow = false,
  ...props
}: ContainerProps) {
  return (
    <Tag
      className={[
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        narrow ? 'max-w-4xl' : 'max-w-7xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </Tag>
  );
}
