import { useEffect, useRef, useState } from "react";
import api from "../../api/client.js";

const KEYS = ["places", "partners", "bookings", "formats"];

// Counts from 0 to `value` once the row scrolls into view.
function CountUp({ value, run, locale }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!run) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Background tabs pause animation frames; land on the real number anyway.
    const finish = setTimeout(() => setShown(value), duration + 200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(finish);
    };
  }, [value, run]);

  return <>{shown.toLocaleString(locale)}</>;
}

// Live numbers from /api/places/stats/; the row hides if they cannot load.
export default function LiveStats({ labels, lang }) {
  const [stats, setStats] = useState(null);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api.get("/api/places/stats/", { skipAuth: true })
      .then((res) => setStats(res.data))
      .catch(() => setStats(false));
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    // Already on screen when the page opens: start right away.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [stats]);

  if (stats === false) return null;
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";

  return (
    <section ref={ref} className={`ab-stats${inView ? " is-in" : ""}`} aria-label="Joyzone">
      {KEYS.map((key, index) => (
        <div key={key} style={{ "--i": index }}>
          <strong>{stats ? <CountUp value={Number(stats[key]) || 0} run={inView} locale={locale} /> : "—"}</strong>
          <span>{labels[key]}</span>
        </div>
      ))}
    </section>
  );
}
