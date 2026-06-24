import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = '1rem', borderRadius = '4px', style }) => (
  <div style={{
    width, height, borderRadius,
    background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--border) 50%, var(--surface-hover) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    ...style,
  }} />
);

export const CardSkeleton: React.FC = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
    <Skeleton height="1.2rem" width="60%" />
    <Skeleton height="2rem" width="40%" />
    <Skeleton height="0.8rem" width="80%" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => (
  <div className="card" style={{ padding: 0 }}>
    <div style={{ padding: '1rem', borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-hover)' }}>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} height="0.9rem" width={`${100 / cols}%`} />)}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, row) => (
      <div key={row} style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '2rem' }}>
        {Array.from({ length: cols }).map((_, col) => <Skeleton key={col} height="0.8rem" width={`${100 / cols}%`} />)}
      </div>
    ))}
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
      {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
      {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  </div>
);
