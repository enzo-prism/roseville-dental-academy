"use client";

import { useEffect, useRef } from "react";

type LazyVideoProps = {
  className?: string;
  label: string;
  poster: string;
  src: string;
};

/**
 * Muted looping clip that only downloads and plays while on screen, so a page
 * of videos costs nothing until the visitor scrolls to them. Respects
 * reduced motion by staying on the poster frame.
 */
export function LazyVideo({ className, label, poster, src }: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
