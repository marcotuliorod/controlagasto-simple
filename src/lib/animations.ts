/**
 * Animation utilities for UX 2026 redesign
 * Provides consistent animations with reduced-motion support
 */

export const animationDurations = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const easings = {
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.6, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const animations = {
  fadeIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  shake: {
    animate: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 },
    },
  },
} as const;

export function getAnimationClass(
  animation: 'fade' | 'slide' | 'scale' | 'none',
  prefersReducedMotion: boolean
): string {
  if (prefersReducedMotion) return 'motion-reduce:transition-none';
  
  const animationMap = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-up',
    scale: 'animate-scale-in',
    none: '',
  };
  
  return animationMap[animation];
}
