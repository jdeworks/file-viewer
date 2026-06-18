import { useState } from "react";

export default function Widget({ title, children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="widget">
      <button onClick={() => setExpanded(!expanded)}>{title}</button>
      {expanded && <div className="widget-body">{children}</div>}
    </article>
  );
}
