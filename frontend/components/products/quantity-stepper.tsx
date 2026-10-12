interface QuantityStepperProps {
  label: string;
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  canIncrease?: boolean;
  size?: "sm" | "md";
}

export function QuantityStepper({
  label,
  quantity,
  onDecrease,
  onIncrease,
  canIncrease = true,
  size = "sm",
}: QuantityStepperProps) {
  const button = size === "sm" ? "h-8 w-7" : "h-11 w-11 text-lg";
  return (
    <div
      className="flex items-center rounded-lg bg-brand-600 text-white shadow-sm"
      role="group"
      aria-label={`Quantity of ${label}`}
    >
      <button type="button" onClick={onDecrease} className={`${button} rounded-l-lg font-bold hover:bg-brand-700`} aria-label={`Decrease ${label}`}>
        −
      </button>
      <span className={`${size === "sm" ? "min-w-6" : "min-w-10"} text-center text-sm font-bold`} aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        className={`${button} rounded-r-lg font-bold hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50`}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}
