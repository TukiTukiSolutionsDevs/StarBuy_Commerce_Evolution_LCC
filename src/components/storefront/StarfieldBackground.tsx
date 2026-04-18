'use client';

/**
 * StarfieldBackground — Storefront ambient effect
 *
 * Campo de estrellas sutil, fijo al viewport.
 * Se mantiene visible durante el scroll (position: fixed).
 *
 * Decisiones:
 * - `useSyncExternalStore` con snapshot cacheado: server retorna array vacío,
 *   cliente retorna las 40 estrellas tras el primer requestAnimationFrame.
 *   Este es el patrón oficial de React 18+ para data lazy-loaded post-mount
 *   sin caer en el antipatrón setState-in-effect.
 * - Animación `twinkle` + delays random: sensación orgánica.
 * - `aria-hidden` + `pointer-events-none`: cero impacto en accesibilidad e interacción.
 * - Reutiliza `.animate-twinkle` y `@keyframes twinkle` ya definidos en globals.css.
 */

import { useSyncExternalStore } from 'react';

type Star = {
  id: number;
  top: string;
  left: string;
  size: number;
  color: 'gold' | 'white';
  duration: number; // segundos
  delay: number; // segundos
};

const STAR_COUNT = 40;

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    // 70% chicas (2px), 30% medianas (3px) — profundidad visual
    size: Math.random() < 0.7 ? 2 : 3,
    // 60% doradas (match brand), 40% blancas (contraste sutil)
    color: Math.random() < 0.6 ? 'gold' : 'white',
    // Twinkle duration 3–6s, delay 0–5s → ciclos desfasados
    duration: 3 + Math.random() * 3,
    delay: Math.random() * 5,
  }));
}

// ── External store (module-scoped) para useSyncExternalStore ──────────────
//
// El snapshot debe ser REFERENCIALMENTE ESTABLE entre renders, si no React
// entra en loop infinito. Por eso cacheamos en module scope la primera vez
// que se solicita el snapshot en el cliente.

const EMPTY_STARS: readonly Star[] = [];
let cachedStars: readonly Star[] | null = null;

function subscribe(onStoreChange: () => void): () => void {
  // Triggereamos un único "cambio" tras el primer paint via rAF,
  // para que React vuelva a llamar getSnapshot y obtenga las estrellas.
  const raf = requestAnimationFrame(onStoreChange);
  return () => cancelAnimationFrame(raf);
}

function getSnapshot(): readonly Star[] {
  if (!cachedStars) cachedStars = generateStars(STAR_COUNT);
  return cachedStars;
}

function getServerSnapshot(): readonly Star[] {
  return EMPTY_STARS;
}

export function StarfieldBackground() {
  // SSR → EMPTY_STARS. Primer render cliente → también EMPTY_STARS (sin
  // mismatch). Tras rAF, subscribe dispara → React re-pide snapshot →
  // obtiene las 40 estrellas cacheadas → re-renderiza.
  const stars = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {stars.map((star) => {
        const isGold = star.color === 'gold';
        return (
          <span
            key={star.id}
            className="absolute rounded-full animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              background: isGold
                ? 'radial-gradient(circle, #f8cc69 0%, #c9a84c 60%, transparent 100%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 60%, transparent 100%)',
              boxShadow: isGold
                ? '0 0 4px rgba(201,168,76,0.6), 0 0 8px rgba(248,204,105,0.3)'
                : '0 0 4px rgba(255,255,255,0.5)',
              // Variables CSS consumidas por `.animate-twinkle` (globals.css)
              ['--twinkle-duration' as string]: `${star.duration}s`,
              ['--twinkle-delay' as string]: `${star.delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
