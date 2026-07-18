"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";

const Scene = dynamic(() => import("@/components/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full">
      <div className="loader" />
    </div>
  ),
});

const PLANET_NAMES = ["Sun", "Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activePlanetIndex, setActivePlanetIndex] = useState(0);
  const lastScrollTime = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const transitionTo = useCallback(
    (direction: "next" | "prev") => {
      const now = Date.now();
      // 1.2s cooldown to let the smooth 3D scroll complete
      if (now - lastScrollTime.current < 1200) return;

      const nextIndex =
        direction === "next"
          ? activePlanetIndex + 1
          : activePlanetIndex - 1;

      if (nextIndex < 0 || nextIndex >= PLANET_NAMES.length) return;

      lastScrollTime.current = now;
      setActivePlanetIndex(nextIndex);
    },
    [activePlanetIndex]
  );

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        transitionTo("next");
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        transitionTo("prev");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transitionTo]);

  return (
    <main 
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: "radial-gradient(circle at 0% 50%, rgba(255, 68, 0, 0.28) 0%, transparent 45%), radial-gradient(circle at 60% 55%, rgba(0, 180, 160, 0.2) 0%, transparent 55%), radial-gradient(circle at 100% 20%, rgba(0, 102, 255, 0.22) 0%, transparent 50%), radial-gradient(circle at 30% 85%, rgba(130, 30, 180, 0.15) 0%, transparent 45%), #030010"
      }}
    >
      {/* 3D Canvas — full viewport */}
      <div className="absolute inset-0 z-0">
        {mounted && (
          <Scene
            activePlanetIndex={activePlanetIndex}
            onSelectPlanet={(index) => {
              const now = Date.now();
              if (now - lastScrollTime.current < 1200) return;
              lastScrollTime.current = now;
              setActivePlanetIndex(index);
            }}
          />
        )}
      </div>

      {/* Planet name — centered at bottom with fade transition */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        {PLANET_NAMES.map((name, index) => (
          <h1
            key={name}
            className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-5xl md:text-7xl font-bold text-white/90 whitespace-nowrap transition-all duration-700 ease-out ${
              index === activePlanetIndex
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-8 scale-95 pointer-events-none"
            }`}
          >
            {name}
          </h1>
        ))}
      </div>

      {/* Navigation dots */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3">
        {PLANET_NAMES.map((name, index) => (
          <button
            key={name}
            onClick={() => {
              const now = Date.now();
              if (now - lastScrollTime.current < 1200) return;
              lastScrollTime.current = now;
              setActivePlanetIndex(index);
            }}
            className={`group relative w-3 h-3 rounded-full transition-all duration-300 ${
              index === activePlanetIndex
                ? "bg-white scale-125 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                : "bg-white/25 hover:bg-white/50"
            }`}
            title={name}
          >
            <span
              className={`absolute right-6 top-1/2 -translate-y-1/2 text-xs text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
            >
              {name}
            </span>
          </button>
        ))}
      </div>

      {/* Scroll hint */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none transition-opacity duration-1000 ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[10px] tracking-[0.3em] uppercase text-white/20">
          Click a celestial body to focus | Drag to rotate 360° | Scroll to Zoom
        </span>
      </div>
    </main>
  );
}

