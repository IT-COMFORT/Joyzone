import React from "react";
import "./accentTitle.css";

// Section heading with one orange word and a small curve under the END of
// that word. `highlight` picks the word (e.g. "Joyzone"); when it is empty
// or not in the (translated) text, the first word is used.
export default function AccentTitle({ text, highlight = "" }) {
  const value = String(text || "");
  let start = highlight ? value.toLowerCase().indexOf(highlight.toLowerCase()) : -1;
  let length = highlight.length;
  if (start < 0) {
    const match = value.match(/\S+/);
    if (!match) return value;
    start = match.index;
    length = match[0].length;
  }

  return (
    <>
      {value.slice(0, start)}
      <span className="accent-word">
        {value.slice(start, start + length)}
        <svg className="accent-curve" width="80" height="10" viewBox="0 0 80 10" fill="none" aria-hidden="true">
          <path d="M2 8C22 1 58 1 78 8" stroke="#E46630" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      {value.slice(start + length)}
    </>
  );
}
