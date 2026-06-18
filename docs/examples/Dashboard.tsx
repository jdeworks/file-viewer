import React, { useMemo, useState } from "react";

type Metric = { label: string; value: number };

export function Dashboard({ metrics }: { metrics: Metric[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = useMemo(() => showAll ? metrics : metrics.slice(0, 3), [metrics, showAll]);

  return (
    <section aria-label="Build metrics">
      <h2>Build metrics</h2>
      <ul>
        {visible.map((metric) => (
          <li key={metric.label}>{metric.label}: {metric.value}</li>
        ))}
      </ul>
      <button onClick={() => setShowAll((value) => !value)}>
        {showAll ? "Show fewer" : "Show all"}
      </button>
    </section>
  );
}
