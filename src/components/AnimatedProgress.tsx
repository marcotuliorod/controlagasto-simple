import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number; // 0-100
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}

export function AnimatedProgress({
  value,
  size = "md",
  showValue = true,
  className,
}: AnimatedProgressProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const sizeMap = {
    sm: { width: 80, stroke: 6 },
    md: { width: 120, stroke: 8 },
    lg: { width: 160, stroke: 10 },
  };

  const { width, stroke } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayValue / 100) * circumference;

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    const start = 0;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuad = 1 - (1 - progress) * (1 - progress);
      const current = start + (value - start) * easeOutQuad;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [value, prefersReducedMotion]);

  const getColor = () => {
    if (value >= 100) return "hsl(var(--destructive))";
    if (value >= 90) return "hsl(var(--warning))";
    if (value >= 75) return "hsl(var(--info))";
    return "hsl(var(--success))";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={width} height={width} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            !prefersReducedMotion && "transition-all duration-1000 ease-out"
          )}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: getColor() }}>
            {Math.round(displayValue)}%
          </span>
        </div>
      )}
    </div>
  );
}
