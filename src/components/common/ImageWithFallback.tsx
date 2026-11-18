import React, { useState } from "react";
import { ImageOff, UserRound } from "lucide-react";
import { coverForKey } from "../../../shared/coverPalette.js";
interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  coverKey?: string | number;
  variant?: "media" | "avatar" | "cover";
}
export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt = "Campus media",
  className = "",
  fallbackSrc = "",
  variant = "media",
  coverKey,
  onLoad,
  onError,
  ...props
}) => {
  const source = src?.trim() || fallbackSrc;
  const colour = coverForKey(coverKey ?? alt);
  const coverStyle = {
    "--cover-light": colour.light,
    "--cover-dark": colour.dark,
  } as React.CSSProperties;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const missing = !source || failedSource === source;
  const loading = !missing && loadedSource !== source;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {missing ? (
        variant === "avatar" ? (
          <div
            role="img"
            aria-label={`${alt}: no profile photo`}
            data-testid="avatar-placeholder"
            className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500"
          >
            <UserRound
              aria-hidden="true"
              className="w-1/2 h-1/2 max-w-12 max-h-12"
            />
          </div>
        ) : variant === "cover" ? (
          <div
            role="img"
            aria-label={`${alt}: solid ${colour.name} cover`}
            data-cover-color={colour.name}
            style={coverStyle}
            data-testid="space-cover-placeholder"
            className="w-full h-full automatic-space-cover"
          />
        ) : (
          <div
            role="img"
            aria-label={`${alt}: image unavailable`}
            className="w-full h-full bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-2 text-center"
          >
            <ImageOff className="w-6 h-6 mb-1" />
            <span className="text-xs">Image unavailable</span>
          </div>
        )
      ) : (
        <>
          {loading && (
            <div
              className="absolute inset-0 bg-slate-100 dark:bg-slate-900 animate-pulse"
              aria-hidden="true"
            />
          )}
          <img
            {...props}
            src={source}
            alt={alt}
            onLoad={(event) => {
              setLoadedSource(source);
              onLoad?.(event);
            }}
            onError={(event) => {
              setFailedSource(source);
              onError?.(event);
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? "opacity-0" : "opacity-100"}`}
          />
        </>
      )}
    </div>
  );
};
