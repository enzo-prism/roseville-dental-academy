"use client";

import { useMemo, useState } from "react";

import { PhotoLightboxGrid, type LightboxPhoto } from "@/components/academy/photo-lightbox";

type GalleryGroup = {
  copy: string;
  items: readonly { alt: string; src: string }[];
  title: string;
};

/** Filterable masonry gallery; every tile opens the shared lightbox. */
export function PhotoGallery({ groups }: { groups: readonly GalleryGroup[] }) {
  const [filter, setFilter] = useState<string>("all");
  const photos = useMemo<LightboxPhoto[]>(
    () =>
      groups
        .filter((group) => filter === "all" || group.title === filter)
        .flatMap((group) =>
          group.items.map((item) => ({ alt: item.alt, caption: `${group.title} · ${item.alt}`, group: group.title, src: item.src })),
        ),
    [filter, groups],
  );
  const activeGroup = groups.find((group) => group.title === filter);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="ac-photo-gallery">
      <div aria-label="Filter photos" className="ac-filter-bar" role="toolbar">
        <button
          aria-pressed={filter === "all"}
          className="ac-filter-chip"
          onClick={() => setFilter("all")}
          type="button"
        >
          All photos <span>{total}</span>
        </button>
        {groups.map((group) => (
          <button
            aria-pressed={filter === group.title}
            className="ac-filter-chip"
            key={group.title}
            onClick={() => setFilter(group.title)}
            type="button"
          >
            {group.title} <span>{group.items.length}</span>
          </button>
        ))}
      </div>
      <p aria-live="polite" className="ac-gallery-status">
        {activeGroup ? activeGroup.copy : `${total} photos from class, clinic, and graduation days.`}
      </p>
      <PhotoLightboxGrid
        className="ac-masonry"
        itemClassName="ac-gallery-tile ac-masonry-tile rda-gallery-item"
        key={filter}
        photos={photos}
        renderOverlay={(photo) => <span className="ac-masonry-label">{photo.group}</span>}
        sizes="(max-width: 760px) 50vw, 25vw"
      />
    </div>
  );
}
