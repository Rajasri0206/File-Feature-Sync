import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number | null | undefined;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  colorClass?: string;
}

export function ScoreGauge({
  score,
  label,
  size = "md",
  className,
  colorClass = "text-primary",
}: ScoreGaugeProps) {
  const displayScore = score ?? 0;
  const radius = size === "sm" ? 28 : size === "md" ? 44 : 64;
  const stroke = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-[88px] h-[88px]",
    lg: "w-32 h-32",
  };

  const textClasses = {
    sm: "text-sm font-bold",
    md: "text-xl font-bold",
    lg: "text-3xl font-bold",
  };

  const labelClasses = {
    sm: "text-xs",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          sizeClasses[size],
        )}
      >
        <svg
          height={radius * 2}
          width={radius * 2}
          className="absolute -rotate-90 transform"
        >
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-muted opacity-30"
          />
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: "stroke-dashoffset 1s ease-in-out" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className={colorClass}
          />
        </svg>
        <span className={cn("absolute", textClasses[size], colorClass)}>
          {score != null ? Math.round(score) : "-"}
        </span>
      </div>
      <span className={cn("font-medium text-muted-foreground text-center", labelClasses[size])}>
        {label}
      </span>
    </div>
  );
}
