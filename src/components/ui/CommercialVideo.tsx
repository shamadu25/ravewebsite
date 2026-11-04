"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/utils";

const SRC_720 = "/video/ravesoft-commercial-720p.mp4";
const SRC_1080 = "/video/ravesoft-commercial-1080p.mp4";
const POSTER = "/video/ravesoft-commercial-poster.webp";

interface NavigatorWithConnection extends Navigator {
  connection?: { saveData?: boolean; effectiveType?: string };
}

/**
 * RaveSoft commercial. Nothing is downloaded until the visitor presses play (preload="none"), it never autoplays
 * (the film has sound), and the box is a fixed 16:9 so it cannot shift the layout. Phones and data-saver / slow
 * connections get the 720p file (~4 MB); large screens on a normal connection get 1080p (~6 MB).
 * Plays are reported through the existing trackEvent(): video_play, video_progress (25/50/75) and video_complete.
 */
export default function CommercialVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const started = useRef(false);
  const marks = useRef<Set<number>>(new Set());

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const conn = (navigator as NavigatorWithConnection).connection;
    const constrained = Boolean(conn?.saveData) || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? "");
    if (window.innerWidth >= 1024 && !constrained && !v.currentSrc.endsWith("1080p.mp4") && v.paused && v.currentTime === 0) {
      v.src = SRC_1080; // preload="none": switching the source before play costs nothing
    }
  }, []);

  return (
    <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/50">
      <video
        ref={video}
        controls
        playsInline
        preload="none"
        poster={POSTER}
        aria-label="RaveSoft Digital Solutions commercial"
        className="h-full w-full object-contain"
        onPlay={() => {
          if (started.current) return;
          started.current = true;
          trackEvent("video_play", { video: "commercial", location: "homepage" });
        }}
        onTimeUpdate={(e) => {
          const { currentTime, duration } = e.currentTarget;
          if (!duration) return;
          const pct = (currentTime / duration) * 100;
          for (const m of [25, 50, 75]) {
            if (pct >= m && !marks.current.has(m)) {
              marks.current.add(m);
              trackEvent("video_progress", { video: "commercial", percent: m });
            }
          }
        }}
        onEnded={() => trackEvent("video_complete", { video: "commercial", location: "homepage" })}
      >
        <source src={SRC_720} type="video/mp4" />
        <p className="p-6 text-sm text-gray-300">
          Your browser can&apos;t play this video.{" "}
          <a href={SRC_720} className="font-semibold text-blue-300 underline">Download it instead</a>.
        </p>
      </video>
    </div>
  );
}
