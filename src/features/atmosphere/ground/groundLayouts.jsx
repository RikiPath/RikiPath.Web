// Composition engine data: five hand-composed Japanese ground scenes for a 1200×320 canvas.
// Every layout keeps the left ~40% calm (distant range, meadow, open water) for the greeting and puts its focal
// architecture and large trees on the right, where the scene stays visible on narrow screens (xMax slice).
// Each layout returns its own pieces per layer; the renderer always stacks layers in the same order.
import {
  ArchBridge,
  BambooGrove,
  Bush,
  CanopyTree,
  GrassTufts,
  House,
  Lake,
  MountainRange,
  Pagoda,
  PineTree,
  PlankBridge,
  River,
  Rock,
  Shrine,
  StoneLantern,
  StonePath,
  LanternString,
  Torii,
} from './GroundElements.jsx';

export const GROUND_W = 1200;
export const GROUND_H = 320;

const HYDRANGEA = ['#8FA7E8', '#B39DDB', '#F3A6C4'];
const AZALEA = ['#F07FA0', '#FFC1D3', '#F5A3B7'];

/** Shared context fields: P (palette), F (foliage), ids, snow, lights, water, richness, sway, motion. */
const tufts = (list) => list.map(([x, y, s]) => [x, y, s]);

export const LAYOUTS = {
  sakura_riverside: {
    mountains: (c) => (
      <MountainRange P={c.P} ids={c.ids} W={GROUND_W} base={182} peaks={[{ x: 150, h: 58, w: 320 }, { x: 430, h: 80, w: 360 }, { x: 1090, h: 74, w: 330 }]} hero={{ x: 770, h: 132, w: 430 }} />
    ),
    architecture: (c) => (
      <>
        {c.richness >= 2 && <Pagoda P={c.P} x={472} y={206} s={0.42} snow={c.snow} lights={c.lights} />}
        <House P={c.P} x={560} y={212} s={0.42} lights={c.lights} snow={c.snow} noren={false} />
        <Torii P={c.P} x={636} y={214} s={0.36} snow={c.snow} />
        <House P={c.P} x={968} y={240} s={0.92} lights={c.lights} snow={c.snow} />
        {c.richness >= 1 && <House P={c.P} x={872} y={222} s={0.55} flip lights={c.lights} snow={c.snow} noren={false} />}
      </>
    ),
    water: (c) => {
      const d = 'M 606 214 C 664 224, 642 242, 700 256 C 760 272, 806 288, 784 336';
      return (
        <>
          <River P={c.P} ids={c.ids} d={d} width={42} glint={c.water.sunGlint} moon={c.water.moonGlint} ripples={c.water.ripples} shimmer={c.motion} />
          <ArchBridge P={c.P} x={746} y={268} w={118} snow={c.snow} />
        </>
      );
    },
    vegetation: (c) => (
      <>
        <PineTree P={c.P} x={528} y={240} s={0.55} snow={c.snow} />
        <CanopyTree P={c.P} x={846} y={232} s={0.62} foliage={c.F} seed={0.21} snow={c.snow} petals={c.petals} />
        <Rock P={c.P} x={672} y={300} s={0.8} snow={c.snow} />
        <Rock P={c.P} x={832} y={304} s={0.65} flip snow={c.snow} />
        <Bush P={c.P} x={652} y={318} s={0.95} colors={c.greens} flowers={c.flowersOn ? HYDRANGEA : null} seed={0.31} snow={c.snow} />
        <Bush P={c.P} x={1034} y={306} s={0.9} colors={c.greens} flowers={c.flowersOn ? AZALEA : null} seed={0.47} snow={c.snow} />
        <StoneLantern P={c.P} x={906} y={300} s={0.9} lights={c.lights} snow={c.snow} />
        <CanopyTree P={c.P} x={1128} y={322} s={1.22} foliage={c.F} seed={0.73} spread={1.1} snow={c.snow} sway={c.motion} petals={c.petals} />
      </>
    ),
    foreground: (c) => (
      <>
        <StonePath P={c.P} points={[[968, 262, 0.7], [948, 276, 0.8], [918, 290, 0.9], [900, 312, 1]]} />
        <GrassTufts P={c.P} items={tufts([[560, 300, 1], [610, 312, 1.2], [880, 318, 1], [1010, 280, 0.9], [720, 316, 1.1]])} />
      </>
    ),
  },

  mountain_village: {
    mountains: (c) => (
      <MountainRange P={c.P} ids={c.ids} W={GROUND_W} base={186} peaks={[{ x: 260, h: 82, w: 380 }, { x: 560, h: 100, w: 400 }, { x: 1160, h: 92, w: 300 }]} hero={{ x: 900, h: 146, w: 470 }} />
    ),
    slope: (c) => (
      <path d="M 0 304 C 220 300, 420 286, 580 262 C 700 242, 840 210, 980 192 C 1080 182, 1150 176, 1200 174 L 1200 320 L 0 320 Z" fill={c.P.hillNear} opacity="0.92" />
    ),
    architecture: (c) => (
      <>
        <Pagoda P={c.P} x={668} y={232} s={0.56} snow={c.snow} lights={c.lights} />
        <House P={c.P} x={790} y={222} s={0.5} lights={c.lights} snow={c.snow} noren={false} />
        <House P={c.P} x={912} y={206} s={0.46} flip lights={c.lights} snow={c.snow} noren={false} />
        {c.richness >= 1 && <House P={c.P} x={1100} y={196} s={0.42} lights={c.lights} snow={c.snow} noren={false} />}
        <House P={c.P} x={1010} y={252} s={0.78} lights={c.lights} snow={c.snow} wide={1.1} />
        {c.richness >= 2 && <Torii P={c.P} x={720} y={262} s={0.42} snow={c.snow} />}
      </>
    ),
    water: (c) => (
      <River P={c.P} ids={c.ids} d="M 1196 190 C 1160 214, 1188 240, 1140 262 C 1096 282, 1120 300, 1092 336" width={22} glint={c.water.sunGlint} moon={c.water.moonGlint} ripples={c.water.ripples} shimmer={c.motion} />
    ),
    vegetation: (c) => (
      <>
        <PineTree P={c.P} x={600} y={266} s={0.72} snow={c.snow} />
        <PineTree P={c.P} x={860} y={232} s={0.5} flip snow={c.snow} />
        <CanopyTree P={c.P} x={760} y={312} s={0.88} foliage={c.F} seed={0.12} snow={c.snow} sway={c.motion} petals={c.petals} />
        <Rock P={c.P} x={920} y={300} s={0.8} snow={c.snow} />
        <Bush P={c.P} x={1170} y={312} s={0.95} colors={c.greens} flowers={c.flowersOn ? HYDRANGEA : null} seed={0.62} snow={c.snow} />
        <StoneLantern P={c.P} x={1062} y={302} s={0.85} lights={c.lights} snow={c.snow} />
      </>
    ),
    foreground: (c) => (
      <>
        <StonePath P={c.P} points={[[986, 272, 0.65], [968, 286, 0.75], [944, 300, 0.85], [928, 316, 1]]} />
        <GrassTufts P={c.P} items={tufts([[640, 304, 1], [700, 318, 1.1], [860, 312, 1], [1120, 300, 0.9]])} />
      </>
    ),
  },

  lakeside_shrine: {
    mountains: (c) => (
      <MountainRange P={c.P} ids={c.ids} W={GROUND_W} base={196} peaks={[{ x: 220, h: 70, w: 340 }, { x: 470, h: 64, w: 300 }, { x: 1060, h: 86, w: 360 }]} hero={{ x: 720, h: 124, w: 400 }} />
    ),
    water: (c) => (
      <>
        <Lake P={c.P} ids={c.ids} d={LAKE_PATH} reflect={{ x: 720, y: 214, w: 300, h: 64 }} glint={c.water.sunGlint} moon={c.water.moonGlint} ripples={c.water.ripples} shimmer={c.motion} glintY={226} />
        <Torii P={c.P} x={878} y={252} s={0.6} reflect snow={c.snow} />
        <PlankBridge P={c.P} x={540} y={278} s={0.95} />
      </>
    ),
    architecture: (c) => (
      <>
        <House P={c.P} x={512} y={214} s={0.38} lights={c.lights} snow={c.snow} noren={false} />
        {c.richness >= 2 && <Pagoda P={c.P} x={1110} y={212} s={0.44} snow={c.snow} lights={c.lights} />}
        <Shrine P={c.P} x={1036} y={238} s={0.82} snow={c.snow} lights={c.lights} />
      </>
    ),
    vegetation: (c) => (
      <>
        <CanopyTree P={c.P} x={778} y={222} s={0.48} foliage={c.F} seed={0.37} snow={c.snow} petals={c.petals} />
        <PineTree P={c.P} x={960} y={240} s={0.6} flip snow={c.snow} />
        <Rock P={c.P} x={1000} y={296} s={0.85} snow={c.snow} />
        <Bush P={c.P} x={930} y={312} s={0.9} colors={c.greens} flowers={c.flowersOn ? HYDRANGEA : null} seed={0.18} snow={c.snow} />
        <StoneLantern P={c.P} x={1090} y={300} s={0.95} lights={c.lights} snow={c.snow} />
        {c.richness >= 1 && <StoneLantern P={c.P} x={984} y={262} s={0.6} lights={c.lights} snow={c.snow} />}
        <CanopyTree P={c.P} x={1160} y={322} s={1.15} foliage={c.F} seed={0.84} spread={1.05} snow={c.snow} sway={c.motion} petals={c.petals} />
      </>
    ),
    foreground: (c) => (
      <GrassTufts P={c.P} items={tufts([[460, 300, 1], [520, 314, 1.1], [900, 290, 0.9], [1060, 318, 1]])} />
    ),
  },

  bamboo_garden: {
    mountains: (c) => (
      <MountainRange P={c.P} ids={c.ids} W={GROUND_W} base={188} peaks={[{ x: 300, h: 62, w: 380 }, { x: 760, h: 74, w: 420 }]} hero={{ x: 560, h: 100, w: 330 }} />
    ),
    architecture: (c) => (
      <>
        <House P={c.P} x={804} y={250} s={0.74} lights={c.lights} snow={c.snow} wide={0.85} />
        {c.richness >= 2 && <Torii P={c.P} x={660} y={238} s={0.4} snow={c.snow} />}
      </>
    ),
    water: (c) => (
      <River P={c.P} ids={c.ids} d="M 520 222 C 592 234, 566 258, 640 276 C 712 292, 742 304, 716 340" width={26} glint={c.water.sunGlint} moon={c.water.moonGlint} ripples={c.water.ripples} shimmer={c.motion} />
    ),
    vegetation: (c) => (
      <>
        <BambooGrove P={c.P} x={900} y={262} w={120} h={170} count={7} seed={0.41} snow={c.snow} />
        <CanopyTree P={c.P} x={600} y={244} s={0.5} foliage={c.F} seed={0.55} snow={c.snow} petals={c.petals} />
        <Rock P={c.P} x={700} y={296} s={0.9} snow={c.snow} />
        <Rock P={c.P} x={608} y={306} s={0.7} flip snow={c.snow} />
        <StoneLantern P={c.P} x={760} y={300} s={0.95} lights={c.lights} snow={c.snow} />
        {c.richness >= 1 && <StoneLantern P={c.P} x={884} y={290} s={0.7} lights={c.lights} snow={c.snow} />}
        <Bush P={c.P} x={862} y={318} s={0.9} colors={c.greens} flowers={c.flowersOn ? AZALEA : null} seed={0.27} snow={c.snow} />
        <BambooGrove P={c.P} x={1000} y={330} w={210} h={300} count={10} seed={0.77} sway={c.motion} snow={c.snow} />
      </>
    ),
    foreground: (c) => (
      <>
        <StonePath P={c.P} points={[[822, 268, 0.6], [810, 282, 0.7], [790, 296, 0.82], [796, 314, 0.95]]} />
        <GrassTufts P={c.P} items={tufts([[560, 296, 1], [660, 316, 1.1], [980, 300, 1]])} />
      </>
    ),
  },

  lantern_village: {
    mountains: (c) => (
      <MountainRange P={c.P} ids={c.ids} W={GROUND_W} base={184} peaks={[{ x: 230, h: 70, w: 360 }, { x: 600, h: 86, w: 380 }]} hero={{ x: 1000, h: 118, w: 380 }} />
    ),
    street: (c) => (
      <>
        <path d="M 826 214 L 866 214 L 1040 320 L 700 320 Z" fill={c.P.pathShade} />
        <path d="M 830 214 L 862 214 L 1026 320 L 716 320 Z" fill={c.P.path} />
        {[234, 254, 278, 304].map((y, i) => <path key={y} d={`M ${846 - (y - 214) * 1.45} ${y} L ${846 + (y - 214) * 1.55} ${y}`} stroke={c.P.pathShade} strokeWidth={0.8 + i * 0.3} opacity="0.7" />)}
      </>
    ),
    architecture: (c) => (
      <>
        <Torii P={c.P} x={846} y={216} s={0.36} snow={c.snow} />
        <House P={c.P} x={760} y={226} s={0.5} lights={c.lights} snow={c.snow} noren={false} />
        <House P={c.P} x={940} y={226} s={0.5} flip lights={c.lights} snow={c.snow} noren={false} />
        <House P={c.P} x={668} y={262} s={0.74} lights={c.lights} snow={c.snow} storey={2} />
        <House P={c.P} x={1080} y={266} s={0.82} flip lights={c.lights} snow={c.snow} storey={2} />
      </>
    ),
    lanterns: (c) => (
      <>
        <LanternString P={c.P} x1={700} y1={176} x2={990} y2={180} count={7} lights={c.lights} sag={22} />
        {c.richness >= 1 && <LanternString P={c.P} x1={780} y1={196} x2={920} y2={198} count={4} lights={c.lights} sag={12} />}
      </>
    ),
    vegetation: (c) => (
      <>
        <CanopyTree P={c.P} x={560} y={266} s={0.72} foliage={c.F} seed={0.66} snow={c.snow} petals={c.petals} />
        <StoneLantern P={c.P} x={742} y={312} s={0.9} lights={c.lights} snow={c.snow} />
        <StoneLantern P={c.P} x={1000} y={312} s={0.9} lights={c.lights} snow={c.snow} />
        <Bush P={c.P} x={1170} y={316} s={1} colors={c.greens} flowers={c.flowersOn ? HYDRANGEA : null} seed={0.52} snow={c.snow} />
        {c.richness >= 2 && <Pagoda P={c.P} x={1150} y={200} s={0.4} snow={c.snow} lights={c.lights} />}
      </>
    ),
    foreground: (c) => <GrassTufts P={c.P} items={tufts([[520, 304, 1], [620, 316, 1.1], [1130, 300, 1]])} />,
  },
};

export const LAKE_PATH = 'M 400 216 C 560 206, 900 206, 1200 214 L 1200 262 C 1060 276, 860 286, 640 284 C 520 282, 420 268, 388 246 C 372 232, 380 220, 400 216 Z';
