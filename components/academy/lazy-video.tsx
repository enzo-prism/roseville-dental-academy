"use client";

import { useEffect, useRef } from "react";

type NetworkInformation = { effectiveType?: string; saveData?: boolean };

// Data Saver or a 2G-class link: no autoplay; the visitor taps play instead.
function prefersLightData() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ""));
}

type LazyVideoProps = {
  className?: string;
  label: string;
  poster: string;
  src: string;
};

/**
 * Muted looping clip that only downloads and plays while on screen, so a page
 * of videos costs nothing until the visitor scrolls to them. Respects
 * reduced motion by staying on the poster frame, and Data Saver / 2G by
 * showing the poster with controls (nothing downloads until play).
 */
export function LazyVideo({ className, label, poster, src }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (prefersLightData()) {
      video.src = src;
      video.controls = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) {
            video.src = src;
          }
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      aria-label={label}
      className={className}
      data-src={src}
      loop
      muted
      playsInline
      poster={poster}
      preload="none"
      ref={ref}
    />
  );
}
