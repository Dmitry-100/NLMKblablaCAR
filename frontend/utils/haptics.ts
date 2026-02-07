function canUseHaptics(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function vibrate(pattern: number | number[]) {
  if (!canUseHaptics() || prefersReducedMotion()) return;
  navigator.vibrate(pattern);
}

export function hapticLight() {
  vibrate(14);
}

export function hapticSuccess() {
  vibrate([18, 36, 28]);
}
