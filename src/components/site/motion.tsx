import { useEffect, useRef, useState } from "react";

function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** Testo che appare parola per parola, da sfocato a nitido. */
export function BlurText({ text, className = "" }: { text: string; className?: string }) {
  const [ref, seen] = useInView<HTMLParagraphElement>(0.35);
  return (
    <p ref={ref} className={className}>
      {text.split(" ").map((w, i) => (
        <span
          key={i}
          className="inline-block transition-[filter,opacity,transform] duration-[900ms] motion-reduce:transition-none"
          style={{
            transitionDelay: `${i * 45}ms`,
            filter: seen ? "none" : "blur(8px)",
            opacity: seen ? 1 : 0.15,
            transform: seen ? "none" : "translateY(8px)",
          }}
        >
          {w}
          {" "}
        </span>
      ))}
    </p>
  );
}

/** Numero che sale da zero quando entra nello schermo. */
export function CountUp({ to, className = "" }: { to: number; className?: string }) {
  const [ref, seen] = useInView<HTMLParagraphElement>(0.5);
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 1400, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return (
    <p ref={ref} className={className}>
      {n}
    </p>
  );
}
