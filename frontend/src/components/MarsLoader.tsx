"use client";
import { useEffect, useState } from "react";

const MIN_DURATION_MS = 7000;
const TICK_MS = 100;

// Loading screen: the sprite travels across a track toward Mars.
// Real tile-loading progress isn't exposed, so progress fills over at least
// MIN_DURATION_MS, holds at 95% until Mars is ready, then finishes the trip.
export default function MarsLoader({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const step = (100 * TICK_MS) / MIN_DURATION_MS;
    const t = setInterval(() => {
      setProgress((p) => Math.min(ready ? 100 : 95, p + step));
    }, TICK_MS);
    return () => clearInterval(t);
  }, [ready]);

  useEffect(() => {
    if (progress < 100) return;
    const t = setTimeout(onFinish, 400);
    return () => clearTimeout(t);
  }, [progress, onFinish]);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#080b16]"
      style={{ fontFamily: "MainFont, sans-serif" }}
    >
      <style>{`@keyframes loaderBob { 0%,100% { transform: translate(-50%, 0) rotate(-4deg); } 50% { transform: translate(-50%, -10px) rotate(4deg); } }`}</style>

      <div className="relative h-40" style={{ width: "min(640px, 80vw)" }}>
        {/* Track */}
        <div className="absolute bottom-6 left-0 right-16 h-1 rounded-full bg-white/15" />
        <div
          className="absolute bottom-6 left-0 h-1 rounded-full bg-orange-500"
          style={{ width: `calc((100% - 4rem) * ${progress / 100})` }}
        />

        {/* Mars */}
        <div
          className="absolute bottom-0 right-0 h-14 w-14 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #f08a5d, #c1440e 55%, #6b1f05)",
            boxShadow: "0 0 24px rgba(240,100,40,0.45)",
          }}
        />

        {/* Sprite */}
        <img
          src="/images/sprite.png"
          alt=""
          className="absolute bottom-7 h-28 w-auto"
          style={{
            left: `calc((100% - 4rem) * ${progress / 100})`,
            animation: "loaderBob 0.6s ease-in-out infinite",
          }}
        />
      </div>

      <p className="mt-6 text-sm text-white/70">Heading to Mars... {Math.round(progress)}%</p>
    </div>
  );
}
