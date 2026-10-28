import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { FileCheck, Save } from 'lucide-react';
import { PlaneMark } from '../BrandMark';
import { TemplateThumbnail } from '../TemplateThumbnail';
import { A4_HEIGHT_PX, A4_WIDTH_PX } from '../../constants/layout';
import { templates } from '../../data/templates';
import type { Template } from '../../types/resume';
import { cn } from '../../utils/cn';
import { showcaseResume } from './showcaseResume';

/*
 * Three real template renders fanned out like pages on a desk, with the
 * logo's dotted flight trail curling up to the plane.
 *
 * Everything is laid out on a fixed 600×520 canvas and scaled to fit the
 * column, so the composition stays identical from a phone to a wide screen and
 * never overflows. The two badges sit outside the scaled canvas so their text
 * stays readable on phones.
 */
const CANVAS_W = 600;
const CANVAS_H = 520;
const FRONT_H = 424;
const BACK_H = 376;
const widthFor = (h: number) => Math.round((h * A4_WIDTH_PX) / A4_HEIGHT_PX);

const pick = (id: string, fallback: number): Template => templates.find((t) => t.id === id) ?? templates[fallback];

const PAGES: { id: string; fallback: number; h: number; style: CSSProperties; rotate: number; delay: number; z: number }[] = [
  { id: 'horizon', fallback: 1, h: BACK_H, style: { left: 12, top: 100 }, rotate: -8, delay: 260, z: 1 },
  { id: 'atlas', fallback: 2, h: BACK_H, style: { left: CANVAS_W - 12 - widthFor(BACK_H), top: 100 }, rotate: 8, delay: 360, z: 1 },
  { id: 'modern', fallback: 0, h: FRONT_H, style: { left: (CANVAS_W - widthFor(FRONT_H)) / 2, top: 50 }, rotate: 0, delay: 140, z: 2 },
];

function useFitScale(designWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / designWidth));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);
  return [ref, scale] as const;
}

const MOTION_CSS = `
@keyframes pp-trail { to { stroke-dashoffset: -26; } }
@keyframes pp-float { 0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); } 50% { transform: translate3d(3px, -7px, 0) rotate(-2deg); } }
@keyframes pp-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@media (prefers-reduced-motion: no-preference) {
  .pp-trail { animation: pp-trail 1.6s linear infinite; }
  .pp-float { animation: pp-float 6s ease-in-out infinite; }
  .pp-bob { animation: pp-bob 5s ease-in-out infinite; }
  .pp-bob-late { animation: pp-bob 5s ease-in-out 1.5s infinite; }
}`;

export function HeroVisual({ className }: { className?: string }) {
  const [ref, scale] = useFitScale(CANVAS_W);

  return (
    <div
      ref={ref}
      className={cn('relative mx-auto w-full max-w-[600px]', className)}
      style={{ height: CANVAS_H * scale }}
      role="img"
      aria-label="Three resume templates from the gallery, fanned out, with a paper plane taking off above them"
    >
      <style href="pp-landing-motion" precedence="default">
        {MOTION_CSS}
      </style>

      {/* Soft glow behind the pages. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[8%] top-[14%] bottom-[6%] rounded-full bg-gradient-to-tr from-aqua-200/70 via-mint-100/60 to-ink-100/40 blur-3xl"
      />

      <div
        aria-hidden="true"
        inert
        className="absolute top-0 left-1/2"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          marginLeft: -CANVAS_W / 2,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* The flight trail, behind the pages. */}
        <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="absolute inset-0 h-full w-full overflow-visible" fill="none">
          <path
            className="pp-trail text-aqua-500"
            d="M 0 480 C -14 300, 110 118, 300 62 S 476 34, 508 46"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="0.5 12.5"
          />
        </svg>

        {PAGES.map((p) => {
          const t = pick(p.id, p.fallback);
          return (
            <div
              key={p.id}
              className="absolute motion-safe:animate-rise"
              style={{ ...p.style, zIndex: p.z, animationDelay: `${p.delay}ms` }}
            >
              <div
                className={cn(
                  'overflow-hidden rounded-[10px] bg-white ring-1 ring-ink-900/8',
                  p.z === 2 ? 'shadow-[0_2px_6px_rgb(21_28_72/0.06),0_32px_64px_-20px_rgb(21_28_72/0.35)]' : 'shadow-lift',
                )}
                style={{ transform: `rotate(${p.rotate}deg)` }}
              >
                <TemplateThumbnail template={t} height={p.h} resumeData={showcaseResume} className="bg-white" />
              </div>
            </div>
          );
        })}

        {/* The plane, at the end of the trail. */}
        <div className="absolute z-10" style={{ left: 498, top: -8 }}>
          <div className="pp-float">
            <PlaneMark className="h-[58px] drop-shadow-[0_10px_14px_rgb(21_28_72/0.18)]" />
          </div>
        </div>
      </div>

      {/* Badges: outside the scaled canvas so they stay legible on phones. */}
      <div aria-hidden="true" className="absolute bottom-[7%] -left-1 z-20 sm:left-0">
        <div className="pp-bob flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 py-2.5 pr-4 pl-2.5 shadow-lift backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-xl bg-mint-50 text-mint-700 ring-1 ring-mint-200/70 ring-inset">
            <FileCheck className="size-[18px]" strokeWidth={2.2} />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-semibold text-ink-900">Pixel-perfect PDF</span>
            <span className="block text-xs text-slate-500">Exactly like the preview</span>
          </span>
        </div>
      </div>
      <div aria-hidden="true" className="absolute top-[30%] -right-1 z-20 hidden sm:right-0 sm:block">
        <div className="pp-bob-late flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 py-2.5 pr-4 pl-2.5 shadow-lift backdrop-blur">
          <span className="flex size-9 items-center justify-center rounded-xl bg-aqua-50 text-aqua-700 ring-1 ring-aqua-200/70 ring-inset">
            <Save className="size-[18px]" strokeWidth={2.2} />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-semibold text-ink-900">Saved as you type</span>
            <span className="block text-xs text-slate-500">Right in your browser</span>
          </span>
        </div>
      </div>
    </div>
  );
}
