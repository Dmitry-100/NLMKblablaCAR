import React from 'react';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}

function isEmojiAvatar(src?: string | null): boolean {
  return !!src && src.startsWith('emoji:');
}

function getEmoji(src?: string | null): string {
  if (!src) return '🙂';
  return src.replace('emoji:', '').trim() || '🙂';
}

function getInitials(alt: string): string {
  const parts = alt.trim().split(/\s+/).slice(0, 2);
  if (!parts.length) return 'U';
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || 'U';
}

export function Avatar({ src, alt, size = 40, className = '' }: AvatarProps) {
  const sharedClass = `inline-flex items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-sky-100 to-indigo-100 text-slate-700 ${className}`;

  if (isEmojiAvatar(src)) {
    return (
      <div
        className={sharedClass}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
      >
        {getEmoji(src)}
      </div>
    );
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-cover rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={sharedClass}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {getInitials(alt)}
    </div>
  );
}
