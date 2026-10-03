"use client";

import { useMediaUrl } from "@/lib/data/hooks";
import type { MediaRef } from "@/lib/data/types";

/** Shows a stored photo or video (static sample or IndexedDB blob). */
export default function MediaView({
  media,
  alt,
  className,
  controls,
  autoPlay,
}: {
  media: MediaRef;
  alt: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
}) {
  const url = useMediaUrl(media);
  if (!url) return <div className={`media-placeholder ${className ?? ""}`} aria-label={alt} />;
  if (media.kind === "video") {
    return (
      <video
        className={className}
        src={url}
        controls={controls}
        autoPlay={autoPlay}
        muted={!controls}
        loop={!controls}
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={url} alt={alt} draggable={false} />;
}
