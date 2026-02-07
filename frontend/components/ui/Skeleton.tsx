import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-xl ${className}`}
      style={{ background: 'var(--app-skeleton)' }}
    />
  );
}
