"use client";

import { useEffect, useRef } from "react";

type NetworkInformation = { effectiveType?: string; saveData?: boolean };

// Data Saver or a 2G-class link: no autoplay; the visitor taps play instead.
function prefersLightData() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ""));
}

type LazyVideoProps = {
  captionsSrc?: string;
  className?: string;
  /** Native controls, no autoplay. Use for captioned academy clips. */
  controls?: boolean;
  label: string;
  poster: string;
  src: string;
};

/**
 * Poster-first clip with `preload="none"`. Ambient clips stay muted and only
 * download/play while on screen. Controlled clips never autoplay (with or
 * without sound) and can carry an English captions track. Reduced motion
 * keeps ambient clips on their posters; Data Saver / 2G offers tap-to-play.
 */
export function LazyVideo({
  captionsSrc,
  className,
  controls = false,
  label,
  poster,
  src,
}: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const ambient = !controls;

  useEffect(() => {
    const video = ref.current;
    if (!video || !ambient) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (prefersLightData()) {
      video.src = src;
      video.controls = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.getAttribute("src")) {
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
  }, [ambient, src]);

  return (
    <video
      aria-label={label}
      className={className}
      controls={controls || undefined}
      data-src={src}
      loop={ambient || undefined}
      muted={ambient || undefined}
      playsInline
      poster={poster}
      preload="none"
      ref={ref}
      src={ambient ? undefined : src}
    >
      {captionsSrc ? (
        <track
          default={controls || undefined}
          kind="captions"
          label="English"
          src={captionsSrc}
          srcLang="en"
        />
      ) : null}
    </video>
  );
}
