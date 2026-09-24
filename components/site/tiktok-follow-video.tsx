"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { useState } from "react";

type TikTokFollowVideoProps = {
  label: string;
  poster: string;
  posterHeight: number;
  posterWidth: number;
  src: string;
};

/**
 * Click-to-play TikTok preview. Renders only an optimized poster image until the
 * visitor asks for playback, so the ~3 MB mp4 never loads on page view.
 */
export function TikTokFollowVideo({
  label,
  poster,
  posterHeight,
  posterWidth,
  src,
}: TikTokFollowVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying) {
    return (
      <video
        aria-label={label}
        autoPlay
        className="rda-tiktok-follow-video"
        controls
        data-rda-tiktok-video="playing"
        playsInline
        poster={poster}
        preload="auto"
      >
        <source src={src} type="video/mp4" />
      </video>
    );
  }

  return (
    <button
      aria-label={`Play video: ${label}`}
      className="rda-tiktok-video-play"
      data-rda-tiktok-video="poster"
      onClick={() => setIsPlaying(true)}
      type="button"
    >
      <Image
        alt=""
        className="rda-tiktok-follow-video"
        height={posterHeight}
        sizes="(max-width: 760px) 320px, 380px"
        src={poster}
        width={posterWidth}
      />
      <span aria-hidden="true" className="rda-tiktok-video-play-icon">
        <Play fill="currentColor" />
      </span>
    </button>
  );
}
