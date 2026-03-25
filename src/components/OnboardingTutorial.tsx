import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import { useOnboardingStore, ONBOARDING_STEP_COUNT } from '@/stores/onboardingStore';
import { useTrainingStore } from '@/stores/trainingStore';

const PAD = 10;
/** Must match the hole in the SVG mask and the accent border. */
const SPOTLIGHT_RADIUS = 14;

type StepDef = {
  id: string;
  title: string;
  body: string;
  /** CSS selector for spotlight; null = centered card only */
  targetSelector: string | null;
  bullets?: string[];
};

const STEPS: StepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to the field map',
    body:
      'Built for Flight Technologies and ERP operations: plan patrols, load geospatial layers, drop markers, and rehearse scenarios—all in one map workspace tuned for conservation and anti-poaching field work.',
    targetSelector: null,
  },
  {
    id: 'map',
    title: 'Your operating picture',
    body:
      'Pan and zoom the map, tap features on your layers, and use your position puck when GPS is available. This is the shared picture your team works from in the bush or the ops room.',
    targetSelector: '[data-onboarding-target="map"]',
  },
  {
    id: 'search',
    title: 'Search',
    body:
      'Open search to jump to places, find saved markers, and query features from loaded layers. When you are online, you can also search broader place names to fly the map there quickly.',
    targetSelector: '[data-onboarding-target="search"]',
  },
  {
    id: 'layers',
    title: 'Layers',
    body:
      'Tap the layers control to open the layer panel. Upload KML to bring fences, water, tracks, or AO boundaries onto the map, toggle visibility per layer, and remove layers you no longer need.',
    targetSelector: '[data-onboarding-target="layers"]',
  },
  {
    id: 'markers',
    title: 'Markers & measurement',
    body:
      'Use the list control to open your markers panel—edit names, fly to pins, and manage what you have saved. The + control enters drop-pin mode: tap the map to place a marker. The ruler opens distance measurement along the ground.',
    targetSelector: '[data-onboarding-target="markers-toolbar"]',
  },
  {
    id: 'training-book',
    title: 'Enter training mode',
    body:
      'Training is a safe sandbox: practice layouts and comms without affecting live operational markers or layers. Tap the amber book to turn it on—the header shows TRAINING MODE and an Exit control when you are finished.',
    targetSelector: '[data-onboarding-target="training-mode"]',
    bullets: [
      'Operational markers and KML layers stay separate from training-only assets on the map.',
      'Use Exit in the header to leave training and return to normal field tools.',
    ],
  },
  {
    id: 'training-scenario',
    title: 'Random scenarios',
    body:
      'The orange controls at the edge of the training toolbar run **Random Scenario**: it draws scenario cards, seeds notional targets and friendlies inside the current map view, and picks an environmental condition.',
    targetSelector: '[data-onboarding-target="training-scenario"]',
    bullets: [
      'Open the panel, then tap Generate (or Regenerate) to re-roll placement and cards.',
      'Review the summary, active cards, and condition—mirrored in the banner under the header when a condition applies.',
      'Clear removes the current scenario without leaving training mode.',
    ],
  },
  {
    id: 'training-assets',
    title: 'Training markers on the map',
    body:
      'Highlighted here are **Targets** (red) and **Friendlies** (green). Pick a type from the strip, then tap the map to place training-only markers—poachers, snares, rangers, vehicles, camps, and more.',
    targetSelector: '[data-onboarding-target="training-assets"]',
    bullets: [
      'Targets and friendlies are distinct categories so teams can brief threat vs own-force geometry quickly.',
      'Tap a placed marker to select it; use delete mode or Clear All in the toolbar when you want a clean slate.',
    ],
  },
  {
    id: 'training-draw',
    title: 'Drawing & markup',
    body:
      'The pencil control turns on **draw mode**: sketch routes, cordons, or notes directly on the map. Choose a stroke colour, paint with touch or mouse, and undo the last stroke when you need a correction.',
    targetSelector: '[data-onboarding-target="training-draw"]',
    bullets: [
      'Delete mode lets you remove a selected stroke or asset after you tap it.',
      'Drawings are part of the training layer only and clear with your other training content.',
    ],
  },
  {
    id: 'tools-right',
    title: 'Follow, rings & more',
    body:
      'Follow locks the map on your GPS position when you are moving. Concentric circles open range ring settings. When your device supports it, you can enable compass heading. On supported browsers, install adds a home-screen shortcut for faster launch in the field.',
    targetSelector: '[data-onboarding-target="map-tools-right"]',
  },
  {
    id: 'done',
    title: 'You are ready',
    body:
      'You can work offline with saved layers and markers after they are loaded. When signal returns, sync status in the header reflects your connection. Next, allow **location** (and **compass heading** on supported phones) when prompted—those permissions unlock follow mode, your position puck, and map alignment in the field. Stay safe and good patrolling.',
    targetSelector: null,
  },
];

if (STEPS.length !== ONBOARDING_STEP_COUNT) {
  console.warn(
    `Onboarding: STEPS.length (${STEPS.length}) does not match ONBOARDING_STEP_COUNT (${ONBOARDING_STEP_COUNT})`
  );
}

const TRAINING_UI_STEP_IDS = new Set([
  'training-scenario',
  'training-assets',
  'training-draw',
]);

function SpotlightFrame({
  rect,
  pad,
}: {
  rect: DOMRect;
  pad: number;
}) {
  const maskId = useId().replace(/:/g, '');
  const l = rect.left - pad;
  const t = rect.top - pad;
  const w = Math.max(0, rect.width + pad * 2);
  const h = Math.max(0, rect.height + pad * 2);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const rx = w > 0 && h > 0 ? Math.min(SPOTLIGHT_RADIUS, w / 2, h / 2) : SPOTLIGHT_RADIUS;

  return (
    <>
      {/* Single overlay with rounded cutout — same geometry as the ring below */}
      <svg
        className="pointer-events-auto absolute inset-0 h-full w-full"
        aria-hidden
        width={vw}
        height={vh}
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={vw}
            height={vh}
          >
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            <rect x={l} y={t} width={w} height={h} rx={rx} ry={rx} fill="black" />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vw}
          height={vh}
          fill="rgba(2, 6, 23, 0.88)"
          mask={`url(#${maskId})`}
        />
      </svg>
      <div
        className="pointer-events-none absolute border-2 border-field-accent/80 shadow-[0_0_28px_rgba(34,211,238,0.2)] transition-all duration-300 ease-out"
        style={{
          left: l,
          top: t,
          width: w,
          height: h,
          borderRadius: rx,
        }}
        aria-hidden
      />
    </>
  );
}

function useTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(selector);
      setRect(el?.getBoundingClientRect() ?? null);
    };

    measure();
    const t = window.setInterval(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector]);

  return rect;
}

/** Bold **segments** in tutorial copy (no full markdown). */
function RichBodyText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-white/75 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-white/90">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function OnboardingTutorial() {
  const { isActive, stepIndex, nextStep, prevStep, skip, complete } = useOnboardingStore();
  const step = STEPS[stepIndex] ?? STEPS[0];
  const targetRect = useTargetRect(step.targetSelector);

  const hasSpotlight =
    Boolean(targetRect && targetRect.width >= 4 && targetRect.height >= 4);

  useEffect(() => {
    if (!isActive) return;
    const id = step.id;
    if (TRAINING_UI_STEP_IDS.has(id)) {
      useTrainingStore.getState().enterTrainingMode();
    } else {
      useTrainingStore.getState().exitTrainingMode();
    }
  }, [isActive, step.id]);

  const handleSkip = () => {
    useTrainingStore.getState().exitTrainingMode();
    skip();
  };

  const handleComplete = () => {
    useTrainingStore.getState().exitTrainingMode();
    complete();
  };

  /** Welcome: centered. Other steps: bottom sheet using most of the viewport so header + actions stay on-screen. */
  const cardStyle = useMemo((): CSSProperties => {
    const width = 'min(calc(100vw - 2rem), 28rem)';
    const maxH =
      'min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 1rem))';
    if (stepIndex === 0) {
      return {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width,
        maxHeight: maxH,
      };
    }
    return {
      left: '50%',
      bottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
      transform: 'translateX(-50%)',
      width,
      maxHeight: maxH,
    };
  }, [stepIndex]);

  if (!isActive) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === ONBOARDING_STEP_COUNT - 1;

  return (
    <div
      className="fixed inset-0 z-[200] font-field"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
    >
      {stepIndex === 0 && (
        <div className="absolute inset-0 bg-field-darker/88 pointer-events-auto" aria-hidden />
      )}
      {stepIndex > 0 && !hasSpotlight && (
        <div className="absolute inset-0 bg-field-darker/45 pointer-events-auto" aria-hidden />
      )}
      {hasSpotlight && targetRect && <SpotlightFrame rect={targetRect} pad={PAD} />}

      <div
        className="absolute pointer-events-auto z-[210] flex min-h-0 w-full max-w-md flex-col"
        style={cardStyle}
      >
        <div className="flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-2xl border border-field-accent/30 bg-field-darker/95 shadow-2xl shadow-black/50 backdrop-blur-md">
          <div className="h-1 w-full shrink-0 bg-gradient-to-r from-field-accent/60 via-cyan-400/40 to-field-accent/60" />

          <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 sm:px-6 sm:pt-5">
            <header className="shrink-0 space-y-2 pr-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-field-accent/90">
                Field map tour · {stepIndex + 1} / {ONBOARDING_STEP_COUNT}
              </p>
              <h2
                id="onboarding-title"
                className="text-xl font-semibold leading-snug text-white"
              >
                {step.title}
              </h2>
            </header>

            <div
              id="onboarding-body"
              className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]"
            >
              <RichBodyText text={step.body} />
              {step.bullets && step.bullets.length > 0 && (
                <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-white/75 marker:text-field-accent/80">
                  {step.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="mt-4 shrink-0 border-t border-white/10 pt-4 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="touch-manipulation rounded-lg px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/5 hover:text-white/80"
                >
                  Skip tour
                </button>
                <div className="min-w-[4rem] flex-1" />
                {!isFirst && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="touch-manipulation rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/5 active:scale-[0.98]"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={isLast ? handleComplete : nextStep}
                  className="touch-manipulation rounded-xl bg-field-accent px-5 py-2.5 text-sm font-semibold text-field-darker shadow-lg shadow-field-accent/20 transition-colors hover:bg-cyan-300 active:scale-[0.98]"
                >
                  {isLast ? 'Get started' : 'Next'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
