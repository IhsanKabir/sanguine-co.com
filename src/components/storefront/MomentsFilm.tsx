"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

interface Props {
  video: string;
  poster: string;
  alt: string;
}

/**
 * The Moments band's film: starts muted when it scrolls into view (browsers only allow
 * muted autoplay), pauses when it leaves, and has one button for the sound. With reduced
 * motion it waits for a tap. Nothing downloads until the band is near the screen.
 */
export default function MomentsFilm({ video, poster, alt }: Props) {
  const t = useTranslations("home.moments");
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !still) el.play().catch(() => {});
      else if (!entry.isIntersecting) el.pause();
    }, { threshold: 0.4 });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  const toggleSound = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (el.paused) el.play().catch(() => {});
  };
  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return (
    <div className="moment-film">
      <video
        ref={ref}
        src={video}
        poster={poster}
        width={540}
        height={960}
        muted
        loop
        playsInline
        preload="none"
        aria-label={alt}
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className="moment-film-controls">
        <button type="button" onClick={togglePlay} aria-pressed={playing}>{playing ? t("pause") : t("play")}</button>
        <button type="button" onClick={toggleSound} aria-pressed={!muted}>{muted ? t("soundOn") : t("soundOff")}</button>
      </div>
    </div>
  );
}
