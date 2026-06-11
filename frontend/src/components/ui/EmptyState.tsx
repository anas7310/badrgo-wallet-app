import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionButton?: React.ReactNode;
}

export function EmptyState({
  icon,
  title = 'No data available',
  description,
  actionButton,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon ?? (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', marginTop: 8 }}>
        {title}
      </span>
      {description && (
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: '300px', marginTop: 4 }}>
          {description}
        </span>
      )}
      {actionButton && <div style={{ marginTop: 16 }}>{actionButton}</div>}
    </div>
  );
}
