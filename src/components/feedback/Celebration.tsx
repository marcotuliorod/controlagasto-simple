import { useEffect } from "react";
import confetti from "canvas-confetti";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface CelebrationProps {
  trigger: boolean;
  type?: "success" | "goal" | "achievement";
}

export function Celebration({ trigger, type = "success" }: CelebrationProps) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!trigger || prefersReducedMotion) return;

    const configs = {
      success: {
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      },
      goal: {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#60a5fa", "#93c5fd"],
        scalar: 1.2,
      },
      achievement: {
        particleCount: 150,
        spread: 360,
        ticks: 200,
        gravity: 0.5,
        decay: 0.94,
        startVelocity: 30,
        colors: ["#f59e0b", "#fbbf24", "#fcd34d"],
      },
    };

    const config = configs[type];
    confetti(config);

    // Additional burst for achievement
    if (type === "achievement") {
      setTimeout(() => {
        confetti({
          ...config,
          particleCount: 100,
          spread: 120,
        });
      }, 200);
    }
  }, [trigger, type, prefersReducedMotion]);

  return null;
}

export function triggerCelebration(type: "success" | "goal" | "achievement" = "success") {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const configs = {
    success: {
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#10b981", "#34d399", "#6ee7b7"],
    },
    goal: {
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#3b82f6", "#60a5fa", "#93c5fd"],
      scalar: 1.2,
    },
    achievement: {
      particleCount: 150,
      spread: 360,
      ticks: 200,
      gravity: 0.5,
      decay: 0.94,
      startVelocity: 30,
      colors: ["#f59e0b", "#fbbf24", "#fcd34d"],
    },
  };

  const config = configs[type];
  confetti(config);

  if (type === "achievement") {
    setTimeout(() => {
      confetti({
        ...config,
        particleCount: 100,
        spread: 120,
      });
    }, 200);
  }
}
