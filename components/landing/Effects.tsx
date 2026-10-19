"use client";

import { useEffect } from "react";

function count(el: HTMLElement, to: number) {
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min((t - t0) / 1300, 1);
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function Effects() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          io.unobserve(el);
          if (el.dataset.count) count(el, Number(el.dataset.count));
        }),
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-reveal],[data-count]").forEach((el) => io.observe(el));
    const head = document.getElementById("lp-head");
    const onScroll = () => head?.classList.toggle("solid", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
