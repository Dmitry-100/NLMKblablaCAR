const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#6366f1'];

export function launchConfetti(durationMs = 1400) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const container = document.createElement('div');
  container.className = 'confetti-layer';
  document.body.appendChild(container);

  const particleCount = Math.min(80, Math.max(24, Math.floor(window.innerWidth / 10)));

  for (let i = 0; i < particleCount; i += 1) {
    const piece = document.createElement('span');
    const left = Math.random() * 100;
    const size = 6 + Math.random() * 8;
    const delay = Math.random() * 0.35;
    const duration = 0.9 + Math.random() * 0.8;

    piece.className = 'confetti-piece';
    piece.style.left = `${left}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.55}px`;
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.animationDelay = `${delay}s`;
    piece.style.animationDuration = `${duration}s`;
    piece.style.transform = `translateY(-10px) rotate(${Math.random() * 360}deg)`;

    container.appendChild(piece);
  }

  window.setTimeout(() => {
    container.remove();
  }, durationMs);
}
