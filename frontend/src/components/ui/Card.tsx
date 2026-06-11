import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  className?: string;
}

export function Card({
  children,
  hoverable = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`glass-card ${hoverable ? 'glass-card--hover' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
