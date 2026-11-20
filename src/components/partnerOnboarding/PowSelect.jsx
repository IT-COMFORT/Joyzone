import React, { useEffect, useId, useRef, useState } from "react";
import "./powSelect.css";

// Custom dropdown for the partner wizard (replaces the native <select>).
// options: [{ value, label }]. Works with mouse and keyboard.
export function PowSelect({ value, onChange, options, placeholder = "", ariaLabel, testId, compact = false }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option visible while moving with the arrows.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    const rect = rootRef.current?.getBoundingClientRect();
    // Room is measured inside the nearest scrolling box (a modal body, the
    // wizard card), not only the window, so the list is never cut off.
    let top = 0;
    let bottom = window.innerHeight;
    for (let node = rootRef.current?.parentElement; node && node !== document.body; node = node.parentElement) {
      if (/(auto|scroll|hidden)/.test(getComputedStyle(node).overflowY)) {
        const box = node.getBoundingClientRect();
        top = Math.max(top, box.top);
        bottom = Math.min(bottom, box.bottom);
        break;
      }
    }
    // Open upwards only when there is no room below but there is above.
    setDropUp(Boolean(rect) && bottom - rect.bottom < 260 && rect.top - top > 260);
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (index) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(active);
    }
  };

  return (
    <div ref={rootRef} className={`pow-select${open ? " is-open" : ""}${dropUp ? " is-up" : ""}${compact ? " is-compact" : ""}`}>
      <button
        type="button"
        className={`pow-select-trigger${selected && selected.value !== "" ? "" : " is-empty"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        data-testid={testId}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open ? (
        <ul id={listId} ref={listRef} className="pow-select-list" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`${isSelected ? "is-selected" : ""}${index === active ? " is-active" : ""}${option.value === "" ? " is-placeholder" : ""}`}
                onPointerEnter={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {isSelected ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
