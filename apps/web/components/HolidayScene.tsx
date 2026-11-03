/**
 * The holiday, as a film still: snow on the mountain, sun on the sea, a family on the beach.
 * Drawn here as SVG (no photos of real people, nothing to license, nothing for a browser to download).
 *
 * It is built in stacked layers (sky, plane, far mountains, near mountains, sea, glitter, beach) so each
 * one can drift at its own speed: the depth you see in a film. Every layer moves with CSS transforms only,
 * and nothing moves at all for anyone whose device asks for less motion.
 *
 * Purely decorative: the whole scene is hidden from screen readers.
 */

import Image from "next/image";

export type SceneMood = "golden" | "morning" | "dusk";

/**
 * Made with AI on HeyJess.art (Adalbert's own app), so no real people are pictured. Each frame says so in its top bar.
 * `pos` keeps the family (and the light) in view when a wide banner crops the picture.
 */
export const SCENE_PHOTOS = {
  sunset: { src: "/images/scenes/sunset.jpg", mood: "golden", pos: "42% 72%" },
  golden: { src: "/images/scenes/golden.jpg", mood: "golden", pos: "52% 70%" },
  beach: { src: "/images/scenes/beach.jpg", mood: "morning", pos: "56% 60%" },
  night: { src: "/images/scenes/night.jpg", mood: "dusk", pos: "50% 72%" },
  ski: {
    src: "/images/scenes/ski.jpg", mood: "morning", pos: "50% 56%",
    greet: [
      { say: "Guten Morgen.", where: "AT" },
      { say: "Bonjour.", where: "FR" },
      { say: "Buongiorno.", where: "IT" },
      { say: "Bon dia.", where: "AD" },
      { say: "Dobro utro.", where: "BG" },
    ],
  },
  castle: {
    src: "/images/scenes/castle.jpg", mood: "morning", pos: "48% 52%",
    greet: [
      { say: "Bună dimineața.", where: "RO" },
      { say: "Bine ați venit.", where: "RO" },
    ],
  },
} as const satisfies Record<string, { src: string; mood: SceneMood; pos: string; greet?: readonly { say: string; where: string }[] }>;
export type ScenePhoto = keyof typeof SCENE_PHOTOS;

type Palette = {
  sky: string[];
  sunCore: string;
  sunGlow: string;
  cloud: string;
  far: string;
  farSnow: string;
  mid: string;
  midSnow: string;
  haze: string;
  seaTop: string;
  seaBottom: string;
  glint: string;
  land: string;
  trail: string;
};

const PALETTES: Record<SceneMood, Palette> = {
  golden: {
    sky: ["#1d2444", "#4b3f6e", "#b8627a", "#f0915a", "#ffd592"],
    sunCore: "#fff3cf",
    sunGlow: "#ffb866",
    cloud: "#ffc59c",
    far: "#8e6f98",
    farSnow: "#f7cfc0",
    mid: "#4a3a5e",
    midSnow: "#e7b2ab",
    haze: "#f2a77a",
    seaTop: "#f0a06c",
    seaBottom: "#1f2741",
    glint: "#ffe6b0",
    land: "#120e17",
    trail: "#fff1dc",
  },
  morning: {
    sky: ["#2d6aa8", "#5e9dd2", "#a9d3ee", "#dff0f6", "#fff1d2"],
    sunCore: "#fffdf0",
    sunGlow: "#ffe9a8",
    cloud: "#ffffff",
    far: "#9cb6cf",
    farSnow: "#ffffff",
    mid: "#5b7896",
    midSnow: "#eef5fb",
    haze: "#e9f3f8",
    seaTop: "#8fd0e3",
    seaBottom: "#155a80",
    glint: "#ffffff",
    land: "#10222a",
    trail: "#ffffff",
  },
  dusk: {
    sky: ["#060914", "#0f1733", "#26285a", "#5e3a62", "#b85d48"],
    sunCore: "#fff6dc",
    sunGlow: "#f08a5a",
    cloud: "#5c3f63",
    far: "#2c2c50",
    farSnow: "#6d6f9e",
    mid: "#1a1b35",
    midSnow: "#4b4e7c",
    haze: "#6b4565",
    seaTop: "#5e3f5c",
    seaBottom: "#070a16",
    glint: "#ffd9a6",
    land: "#04050b",
    trail: "#d9c8e8",
  },
};

/** Where the light sits, for each mood: the sun (golden, morning) or the moon (dusk). */
const LIGHT: Record<SceneMood, { x: number; y: number; r: number }> = {
  golden: { x: 1080, y: 418, r: 70 },
  morning: { x: 1120, y: 250, r: 44 },
  dusk: { x: 1150, y: 236, r: 20 },
};

const HORIZON = 430;

/** A small, repeatable random sequence, so the server and every visit draw exactly the same scene. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function glints(cx: number, count: number, seed: number) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, () => {
    const t = Math.pow(rnd(), 1.5);
    const y = HORIZON + 6 + t * 230;
    const spread = 18 + (y - HORIZON) * 0.75;
    const x = cx + (rnd() - 0.5) * spread * 1.6;
    const len = 5 + rnd() * (8 + (y - HORIZON) * 0.16);
    const w = 1 + ((y - HORIZON) / 230) * 2.4;
    return { x, y, len, w, o: 0.45 + rnd() * 0.55 };
  });
}

function stars(count: number, seed: number) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, () => ({ x: rnd() * 1600, y: rnd() * 300, r: 0.5 + rnd() * 1.3, o: 0.3 + rnd() * 0.7 }));
}

/** Leaf shape pointing right from the crown; rotated into a palm. */
const LEAF = "M0 0 Q 34 -18 74 4 Q 36 -5 0 0 Z";

function Palm({ bx, by, cx, cy, s = 1, fill }: { bx: number; by: number; cx: number; cy: number; s?: number; fill: string }) {
  const mx = (bx + cx) / 2 + 18 * s;
  const my = (by + cy) / 2;
  return (
    <g fill={fill}>
      <path d={`M${bx} ${by} Q ${mx} ${my} ${cx} ${cy}`} stroke={fill} strokeWidth={9 * s} strokeLinecap="round" fill="none" />
      {[192, 214, 238, 268, 300, 328, 352, 14].map((a) => (
        <path key={a} d={LEAF} transform={`translate(${cx} ${cy}) rotate(${a}) scale(${s})`} />
      ))}
    </g>
  );
}

/** A grown-up, standing, feet at (0,0). Hands are points in the figure's own frame. */
function Adult({ x, y, s = 1, fill, left = [-18, -54], right = [18, -54], dress = false, hair = false, elbows }: {
  x: number; y: number; s?: number; fill: string; left?: number[]; right?: number[]; dress?: boolean; hair?: boolean; elbows?: [number[], number[]];
}) {
  const arm = (sx: number, hand: number[], elbow?: number[]) =>
    elbow ? `${sx},-98 ${elbow[0]},${elbow[1]} ${hand[0]},${hand[1]}` : `${sx},-98 ${hand[0]},${hand[1]}`;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-118" r="10.5" stroke="none" />
      {hair && <ellipse cx="-3.5" cy="-114" rx="11.5" ry="12.5" stroke="none" />}
      <line x1="0" y1="-108" x2="0" y2="-100" strokeWidth="7" />
      <polygon points="-14,-102 14,-102 10,-60 -10,-60" strokeWidth="6" />
      {dress && <polygon points="-10,-62 10,-62 17,-30 -17,-30" strokeWidth="4" />}
      <line x1="-5" y1={dress ? -32 : -62} x2="-8" y2="0" strokeWidth="8.5" />
      <line x1="5" y1={dress ? -32 : -62} x2="9" y2="0" strokeWidth="8.5" />
      <polyline points={arm(-13, left, elbows?.[0])} strokeWidth="7" fill="none" />
      <polyline points={arm(13, right, elbows?.[1])} strokeWidth="7" fill="none" />
    </g>
  );
}

/** A child, standing, feet at (0,0), drawn at child proportions. */
function Child({ x, y, s = 0.62, fill, left = [-20, -56], right = [20, -56] }: { x: number; y: number; s?: number; fill: string; left?: number[]; right?: number[] }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-114" r="13" stroke="none" />
      <polygon points="-13,-98 13,-98 10,-58 -10,-58" strokeWidth="6" />
      <line x1="-5" y1="-60" x2="-8" y2="0" strokeWidth="9" />
      <line x1="5" y1="-60" x2="9" y2="0" strokeWidth="9" />
      <polyline points={`-12,-94 ${left[0]},${left[1]}`} strokeWidth="7.5" fill="none" />
      <polyline points={`12,-94 ${right[0]},${right[1]}`} strokeWidth="7.5" fill="none" />
    </g>
  );
}

/** A child on a grown-up's shoulders, arms up: hips at (0,0). */
function ShoulderChild({ x, y, s = 0.58, fill }: { x: number; y: number; s?: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="0" cy="-58" r="12.5" stroke="none" />
      <polygon points="-12,-44 12,-44 9,-6 -9,-6" strokeWidth="6" />
      <line x1="-6" y1="-6" x2="-17" y2="24" strokeWidth="9" />
      <line x1="6" y1="-6" x2="17" y2="24" strokeWidth="9" />
      <polyline points="-11,-40 -22,-60 -27,-82" strokeWidth="7" fill="none" />
      <polyline points="11,-40 22,-60 27,-82" strokeWidth="7" fill="none" />
    </g>
  );
}

/** A skier mid-turn, leaning into the slope. */
function Skier({ x, y, a, fill }: { x: number; y: number; a: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(0.78)`} fill={fill} stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <line x1="-12" y1="2" x2="12" y2="2" strokeWidth="1.8" />
      <polyline points="-3,1 3,-5 -1,-10" strokeWidth="2.6" fill="none" />
      <line x1="-1" y1="-10" x2="4" y2="-17" strokeWidth="3.4" />
      <circle cx="6" cy="-21" r="2.8" stroke="none" />
      <line x1="4" y1="-14" x2="12" y2="-3" strokeWidth="1.1" />
    </g>
  );
}

type LayerProps = { vb: string; align: string; className: string; children: React.ReactNode };
function Layer({ vb, align, className, children }: LayerProps) {
  return (
    <svg className={`scene-layer ${className}`} viewBox={vb} preserveAspectRatio={`${align} slice`} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const GREETINGS: Record<"day" | "night", { say: string; where: string }[]> = {
  day: [
    { say: "Buenos días.", where: "ES" },
    { say: "Kaliméra.", where: "GR" },
    { say: "Bom dia.", where: "PT" },
    { say: "Günaydın.", where: "TR" },
    { say: "Buongiorno.", where: "IT" },
  ],
  night: [
    { say: "Buenas noches.", where: "ES" },
    { say: "Kalinýchta.", where: "GR" },
    { say: "Boa noite.", where: "PT" },
    { say: "İyi geceler.", where: "TR" },
    { say: "Buonanotte.", where: "IT" },
  ],
};

export function HolidayScene({
  mood = "golden",
  variant = "banner",
  focus = "center",
  label,
  photo,
}: {
  mood?: SceneMood;
  /** One of the AI-made pictures instead of the drawn scene. Its mood (day or night greetings) comes with it. */
  photo?: ScenePhoto;
  /** "band": the tall full-width film still on the homepage. "banner": the letterbox strip at the top of a page. */
  variant?: "band" | "banner";
  /** Which part of the scene stays in view on narrow screens: the mountains, the middle, or the family on the beach. */
  focus?: "left" | "center" | "right";
  /** Small slate text in the top bar, e.g. "TRUEVSAD · PLAN B". */
  label?: string;
}) {
  const shot = photo ? SCENE_PHOTOS[photo] : undefined;
  if (shot) mood = shot.mood;
  const p = PALETTES[mood];
  const L = LIGHT[mood];
  const id = `sc-${mood}`;
  const vb = variant === "band" ? "0 0 1600 680" : "0 172 1600 496";
  const align = { left: "xMinYMid", center: "xMidYMid", right: "xMaxYMid" }[focus];
  const g = glints(L.x, mood === "dusk" ? 60 : 90, 7);
  const lines = (shot && "greet" in shot ? shot.greet : undefined) ?? GREETINGS[mood === "dusk" ? "night" : "day"];
  const sky = p.sky;

  return (
    <figure className={`scene scene-${variant} scene-${mood}${shot ? " scene-photo" : ""}`} aria-hidden="true">
      <div className="scene-bar scene-bar-top">
        <span>{label ?? "TRUEVSAD"}</span>
        <span className="scene-bar-right">
          {shot && (
            <span className="scene-credit">
              AI IMAGE<span className="scene-credit-long"> · HEYJESS.ART</span>
            </span>
          )}
          <span className="scene-dots" />
        </span>
      </div>
      <div className="scene-frame">
        <div className="scene-cam">
          {shot ? (
            <Image
              src={shot.src}
              alt=""
              fill
              priority={variant === "banner"}
              sizes="(max-width: 1200px) 100vw, 1168px"
              style={{ objectFit: "cover", objectPosition: shot.pos }}
            />
          ) : (
          <>
          {/* Sky, light and clouds */}
          <Layer vb={vb} align={align} className="layer-sky">
            <defs>
              <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
                {sky.map((c, i) => (
                  <stop key={c} offset={i / (sky.length - 1)} stopColor={c} />
                ))}
              </linearGradient>
              <radialGradient id={`${id}-glow`} cx={L.x} cy={L.y} r={mood === "dusk" ? 160 : 520} gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={p.sunGlow} stopOpacity={mood === "morning" ? 0.6 : 0.85} />
                <stop offset="0.35" stopColor={p.sunGlow} stopOpacity="0.25" />
                <stop offset="1" stopColor={p.sunGlow} stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${id}-rays`} cx={L.x} cy={L.y} r="560" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={p.sunCore} stopOpacity="0.16" />
                <stop offset="1" stopColor={p.sunCore} stopOpacity="0" />
              </radialGradient>
              {mood === "dusk" && (
                <linearGradient id={`${id}-ember`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#ff9a62" stopOpacity="0" />
                  <stop offset="1" stopColor="#ff9a62" stopOpacity="0.45" />
                </linearGradient>
              )}
            </defs>
            <rect x="0" y="0" width="1600" height="680" fill={`url(#${id}-sky)`} />
            {mood === "dusk" && (
              <>
                <rect x="0" y="330" width="1600" height="100" fill={`url(#${id}-ember)`} />
                <g fill="#fff">
                  {stars(110, 3).map((s, i) => (
                    <circle key={i} className={i % 5 === 0 ? "twinkle" : undefined} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
                  ))}
                </g>
              </>
            )}
            <circle cx={L.x} cy={L.y} r={mood === "dusk" ? 160 : 520} fill={`url(#${id}-glow)`} />
            {mood !== "dusk" && (
              <g fill={`url(#${id}-rays)`} className="rays">
                {[
                  [-0.9, -0.82], [-0.6, -0.54], [-0.3, -0.25], [0.02, 0.07], [0.32, 0.38], [0.66, 0.72],
                ].map(([a, b], i) => {
                  const f = (t: number) => `${L.x + Math.sin(t) * 900},${L.y - Math.cos(t) * 900}`;
                  return <polygon key={i} points={`${L.x},${L.y} ${f(a!)} ${f(b!)}`} />;
                })}
              </g>
            )}
            <defs>
              <linearGradient id={`${id}-cloud`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={p.cloud} stopOpacity="0" />
                <stop offset="0.5" stopColor={p.cloud} stopOpacity="1" />
                <stop offset="1" stopColor={p.cloud} stopOpacity="0" />
              </linearGradient>
            </defs>
            <g fill={`url(#${id}-cloud)`}>
              <ellipse cx="330" cy="150" rx="210" ry="6" opacity="0.5" />
              <ellipse cx="640" cy="215" rx="280" ry="8" opacity="0.55" />
              <ellipse cx="1290" cy="262" rx="320" ry="7" opacity="0.5" />
              <ellipse cx="960" cy={mood === "morning" ? 330 : 372} rx="240" ry="4.5" opacity="0.6" />
              <ellipse cx="1440" cy="336" rx="190" ry="3.5" opacity="0.45" />
            </g>
            {mood === "dusk" ? (
              <g>
                <mask id={`${id}-moon`}>
                  <circle cx={L.x} cy={L.y} r={L.r} fill="#fff" />
                  <circle cx={L.x + 9} cy={L.y - 6} r={L.r - 1} fill="#000" />
                </mask>
                <circle cx={L.x} cy={L.y} r={L.r} fill={p.sunCore} mask={`url(#${id}-moon)`} />
              </g>
            ) : (
              <circle cx={L.x} cy={L.y} r={L.r} fill={p.sunCore} className="sun" />
            )}
            <g stroke={mood === "dusk" ? "#9aa0c8" : "#2a2230"} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.55">
              <path d="M520 250 q 8 -8 16 0 q 8 -8 16 0" />
              <path d="M566 228 q 6 -6 12 0 q 6 -6 12 0" />
              <path d="M498 214 q 5 -5 10 0 q 5 -5 10 0" />
            </g>
          </Layer>

          {/* The flight out, crossing the sky */}
          <Layer vb={vb} align={align} className="layer-plane">
            <defs>
              <linearGradient id={`${id}-trail`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={p.trail} stopOpacity="0" />
                <stop offset="1" stopColor={p.trail} stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <g transform="translate(760 246) rotate(-7)">
              <rect x="-620" y="-1.4" width="610" height="2.8" rx="1.4" fill={`url(#${id}-trail)`} />
              <rect x="-620" y="5" width="600" height="2" rx="1" fill={`url(#${id}-trail)`} opacity="0.6" />
              <g fill={mood === "dusk" ? "#c9c3e0" : "#2a2230"}>
                <path d="M-12 -2 L 26 -3 Q 34 0 26 3 L -12 2 Z" />
                <path d="M6 0 L -4 -14 L 1 -14 L 16 0 Z" />
                <path d="M6 0 L -2 13 L 3 13 L 16 0 Z" />
                <path d="M-12 -1 L -16 -8 L -12 -8 L -6 -1 Z" />
              </g>
            </g>
          </Layer>

          {/* Far mountains: the volcano with snow, softened by distance */}
          <Layer vb={vb} align={align} className="layer-far">
            <defs>
              <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={p.haze} stopOpacity="0" />
                <stop offset="1" stopColor={p.haze} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <polygon points="0,350 120,318 230,270 300,226 342,202 376,200 414,220 500,270 620,326 760,372 900,412 980,432 0,432" fill={p.far} />
            <polygon points="300,226 342,202 376,200 414,220 402,230 386,223 370,236 352,225 334,240 316,234" fill={p.farSnow} />
            <polygon points="1240,432 1300,404 1370,392 1430,404 1480,432" fill={p.far} opacity="0.8" />
            <rect x="0" y="300" width="1600" height="132" fill={`url(#${id}-haze)`} />
          </Layer>

          {/* Near mountains with a ski run: two skiers carving down */}
          <Layer vb={vb} align={align} className="layer-mid">
            <polygon points="0,432 0,372 70,336 150,300 222,262 268,270 336,306 430,346 540,386 660,424 690,432" fill={p.mid} />
            <polygon points="128,312 222,262 268,270 336,306 318,316 290,304 262,318 236,306 206,326 170,318" fill={p.midSnow} />
            <g stroke={p.mid} strokeWidth="1.6" fill="none" opacity="0.35" strokeLinecap="round">
              <path d="M224 266 q -14 10 2 16 q 14 6 12 8" />
              <path d="M246 268 q 14 10 0 18 q -12 8 16 22" />
            </g>
            <Skier x={262} y={309} a={-14} fill={p.land} />
            <Skier x={239} y={291} a={16} fill={p.land} />
          </Layer>

          {/* The sea, lit from the sun (or the moon) */}
          <Layer vb={vb} align={align} className="layer-sea">
            <defs>
              <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={p.seaTop} />
                <stop offset="1" stopColor={p.seaBottom} />
              </linearGradient>
              <radialGradient id={`${id}-pool`} cx={L.x} cy={HORIZON + 26} r="300" gradientUnits="userSpaceOnUse" gradientTransform={`translate(${L.x} ${HORIZON + 26}) scale(1 0.22) translate(${-L.x} ${-(HORIZON + 26)})`}>
                <stop offset="0" stopColor={p.sunGlow} stopOpacity={mood === "dusk" ? 0.35 : 0.75} />
                <stop offset="1" stopColor={p.sunGlow} stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="0" y={HORIZON} width="1600" height={680 - HORIZON} fill={`url(#${id}-sea)`} />
            <rect x="0" y={HORIZON} width="1600" height="90" fill={`url(#${id}-pool)`} />
            <rect x={L.x - 360} y={HORIZON - 1} width="720" height="2" fill={p.sunCore} opacity="0.55" />
            <g stroke={p.seaBottom} strokeWidth="1.4" fill="none" opacity="0.28" strokeLinecap="round">
              {[452, 470, 492, 518, 548, 584].map((y, i) => (
                <path key={y} d={`M${-40 + i * 37} ${y} q 60 -5 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0`} />
              ))}
            </g>
          </Layer>
          <Layer vb={vb} align={align} className="layer-glint glint-a">
            <g fill={p.glint}>
              {g.filter((_, i) => i % 2 === 0).map((q, i) => (
                <rect key={i} x={q.x - q.len / 2} y={q.y} width={q.len} height={q.w} rx={q.w / 2} opacity={q.o} />
              ))}
            </g>
          </Layer>
          <Layer vb={vb} align={align} className="layer-glint glint-b">
            <g fill={p.glint}>
              {g.filter((_, i) => i % 2 === 1).map((q, i) => (
                <rect key={i} x={q.x - q.len / 2} y={q.y} width={q.len} height={q.w} rx={q.w / 2} opacity={q.o} />
              ))}
            </g>
          </Layer>

          {/* The beach: a family watching the sun, palms, the headland (and its lighthouse at night) */}
          <Layer vb={vb} align={align} className="layer-fore">
            <path d="M0 680 L0 646 Q 300 606 640 616 Q 980 628 1236 594 Q 1330 566 1388 478 Q 1436 424 1508 408 Q 1560 400 1600 402 L1600 680 Z" fill={p.land} />
            <path d="M0 644 Q 300 604 640 614 Q 980 626 1234 592" stroke={p.glint} strokeWidth="1.6" fill="none" opacity="0.35" />
            <Palm bx={1300} by={590} cx={1268} cy={482} s={1.05} fill={p.land} />
            <Palm bx={1338} by={578} cx={1372} cy={462} s={1.2} fill={p.land} />
            <Palm bx={1450} by={424} cx={1434} cy={346} s={0.85} fill={p.land} />
            {/* Mum holding a child's hand; the child points at the sun. Dad with the little one on his shoulders, arms up. */}
            <Adult x={992} y={630} fill={p.land} dress hair right={[22, -42]} />
            <Child x={1029} y={630} fill={p.land} left={[-22, -62]} right={[30, -150]} />
            <Adult x={1090} y={628} s={1.06} fill={p.land} left={[-10, -92]} right={[10, -92]} elbows={[[-24, -74], [24, -74]]} />
            <ShoulderChild x={1090} y={628 - 112 * 1.06} fill={p.land} />
            {mood === "dusk" && (
              <g>
                <polygon points="1512,408 1530,408 1527,340 1515,340" fill={p.land} />
                <rect x="1512" y="326" width="18" height="14" rx="2" fill="#ffe8b0" />
                <polygon points="1510,326 1532,326 1521,314" fill={p.land} />
              </g>
            )}
          </Layer>
          {mood === "dusk" && (
            <Layer vb={vb} align={align} className="layer-beam">
              <defs>
                <linearGradient id={`${id}-beam`} x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0" stopColor="#fff2c4" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#fff2c4" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="beam">
                <polygon points="1521,333 760,270 760,380" fill={`url(#${id}-beam)`} />
              </g>
            </Layer>
          )}
          </>
          )}
        </div>
      </div>
      <div className="scene-bar scene-bar-bottom">
        <span className="scene-subs">
          {lines.map((l, i) => (
            <span key={l.say} className="scene-sub" style={{ animationDelay: `${(i * 20) / lines.length}s`, animationName: lines.length === 2 ? "tv-sub-2" : undefined }}>
              {l.say} <small>{l.where}</small>
            </span>
          ))}
        </span>
      </div>
    </figure>
  );
}
