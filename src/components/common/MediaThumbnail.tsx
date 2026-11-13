import type { MediaItem } from "../../types";
import { ImageWithFallback } from "./ImageWithFallback";
export function MediaThumbnail({
  media,
  className,
}: {
  media: MediaItem;
  className?: string;
}) {
  return media.media_type === "VIDEO" ? (
    <video
      src={media.media_url}
      aria-label={media.caption || "Video memory"}
      className={className}
      muted
      playsInline
      preload="metadata"
    />
  ) : (
    <ImageWithFallback
      src={media.media_url}
      alt={media.caption}
      className={className}
    />
  );
}
