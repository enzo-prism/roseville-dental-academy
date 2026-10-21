"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export type LightboxPhoto = {
  alt: string;
  caption?: string;
  group?: string;
  src: string;
};

type PhotoLightboxGridProps = {
  className?: string;
  itemClassName?: string;
  photos: readonly LightboxPhoto[];
  renderOverlay?: (photo: LightboxPhoto, index: number) => ReactNode;
  sizes?: string;
};

/**
 * Photo grid whose tiles open a full-screen viewer (native <dialog>) with
 * keyboard, swipe, and arrow navigation. Tiles are real buttons, so the grid
 * works with a keyboard and screen readers.
 */
export function PhotoLightboxGrid({
  className,
  itemClassName = "ac-gallery-tile",
  photos,
  renderOverlay,
  sizes = "(max-width: 760px) 50vw, 25vw",
}: PhotoLightboxGridProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const touchStart = useRef<number | null>(null);

  const close = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  const step = useCallback(
    (delta: number) => setIndex((current) => (current === null ? current : (current + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (index !== null && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("rda-lightbox-open");
    }
  }, [index]);

  useEffect(() => {
    if (index === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index === null ? null : photos[index];

  return (
    <>
      <div className={className}>
        {photos.map((photo, photoIndex) => (
          <button
            aria-label={`Open photo: ${photo.alt}`}
            className={itemClassName}
            data-reveal="zoom"
            key={`${photo.src}-${photoIndex}`}
            onClick={() => setIndex(photoIndex)}
            style={{ "--reveal-delay": photoIndex % 4 } as CSSProperties}
            type="button"
          >
            <Image alt={photo.alt} fill sizes={sizes} src={photo.src} />
            <span aria-hidden="true" className="ac-gallery-tile-expand">
              <Expand />
            </span>
            {renderOverlay?.(photo, photoIndex)}
          </button>
        ))}
      </div>
      <dialog
        aria-label="Photo viewer"
        className="ac-lightbox"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => {
          setIndex(null);
          document.body.classList.remove("rda-lightbox-open");
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const delta = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1);
          touchStart.current = null;
        }}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX;
        }}
        ref={dialogRef}
      >
        {current ? (
          <div className="ac-lightbox-inner">
            <figure className="ac-lightbox-figure" key={current.src}>
              <Image alt={current.alt} fill sizes="100vw" src={current.src} />
            </figure>
            <div className="ac-lightbox-bar">
              <p>
                <span className="ac-lightbox-count">
                  {(index ?? 0) + 1} / {photos.length}
                </span>
                {current.caption ?? current.alt}
              </p>
              <div className="ac-lightbox-actions">
                <button aria-label="Previous photo" className="ac-round-button" onClick={() => step(-1)} type="button">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button aria-label="Next photo" className="ac-round-button" onClick={() => step(1)} type="button">
                  <ChevronRight aria-hidden="true" />
                </button>
                <button aria-label="Close photo viewer" className="ac-round-button" onClick={close} type="button">
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
