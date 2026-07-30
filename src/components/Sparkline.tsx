interface SparklineProps {
  values: number[];
  /** Fixed bounds; when omitted the line auto-fits the data with padding. */
  min?: number;
  max?: number;
  width?: number;
  height?: number;
  className?: string;
}

/** Dependency-free SVG sparkline. */
export function Sparkline({ values, min, max, width = 120, height = 32, className }: SparklineProps) {
  if (values.length < 2) return null;
  if (min === undefined || max === undefined) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(2, (hi - lo) * 0.2);
    min = min ?? lo - pad;
    max = max ?? hi + pad;
  }
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((Math.min(max, Math.max(min, v)) - min) / span) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
