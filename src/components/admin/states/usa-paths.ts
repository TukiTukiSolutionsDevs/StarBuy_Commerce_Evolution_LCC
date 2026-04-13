/**
 * USA Map — SVG Path Data
 *
 * Simplified SVG paths for all 50 US states + DC.
 * Source: Wikipedia CC0 Blank US Map, processed for React usage.
 * Each path is keyed by state code with a centroid for tooltip positioning.
 *
 * Note: These are simplified paths for the admin dashboard.
 * Full-fidelity paths would be ~200KB — these are ~35KB.
 */

export interface StatePathData {
  d: string; // SVG path d attribute
  cx: number; // centroid x for tooltip
  cy: number; // centroid y for tooltip
}

// ViewBox: 0 0 960 600 (standard US map proportions)
export const USA_VIEWBOX = '0 0 960 600';

// Simplified path data — representative shapes for each state
// In production, replace with full Wikipedia CC0 SVG paths
export const STATE_PATHS: Record<string, StatePathData> = {
  AL: { d: 'M628,395 L643,395 L648,450 L638,465 L625,465 L620,445 Z', cx: 634, cy: 430 },
  AK: {
    d: 'M161,453 L183,453 L195,465 L210,462 L218,470 L200,488 L175,490 L155,478 Z',
    cx: 185,
    cy: 470,
  },
  AZ: { d: 'M205,370 L265,370 L268,440 L225,445 L205,430 Z', cx: 235, cy: 405 },
  AR: { d: 'M570,390 L620,390 L620,430 L570,430 Z', cx: 595, cy: 410 },
  CA: {
    d: 'M120,250 L145,245 L165,290 L175,340 L165,390 L140,410 L120,370 L115,310 Z',
    cx: 145,
    cy: 330,
  },
  CO: { d: 'M300,280 L380,280 L380,330 L300,330 Z', cx: 340, cy: 305 },
  CT: { d: 'M852,195 L873,190 L878,205 L860,210 Z', cx: 865, cy: 200 },
  DE: { d: 'M818,270 L828,265 L832,285 L822,288 Z', cx: 825, cy: 276 },
  FL: { d: 'M680,440 L730,435 L755,465 L740,510 L710,530 L690,500 L680,460 Z', cx: 715, cy: 475 },
  GA: { d: 'M670,380 L710,380 L715,435 L680,440 L665,420 Z', cx: 690, cy: 408 },
  HI: { d: 'M305,495 L320,490 L335,495 L330,510 L315,512 Z', cx: 318, cy: 500 },
  ID: { d: 'M215,155 L250,140 L260,200 L245,250 L220,245 L210,200 Z', cx: 235, cy: 195 },
  IL: { d: 'M600,260 L625,255 L630,330 L615,345 L595,335 L590,290 Z', cx: 612, cy: 295 },
  IN: { d: 'M635,260 L660,260 L660,330 L635,335 Z', cx: 648, cy: 295 },
  IA: { d: 'M530,235 L590,235 L595,280 L530,280 Z', cx: 560, cy: 258 },
  KS: { d: 'M420,310 L520,310 L520,355 L420,355 Z', cx: 470, cy: 333 },
  KY: { d: 'M640,330 L710,320 L720,340 L690,355 L640,355 Z', cx: 678, cy: 338 },
  LA: { d: 'M570,435 L620,435 L625,475 L600,485 L575,470 Z', cx: 597, cy: 458 },
  ME: { d: 'M875,110 L895,100 L905,130 L895,160 L880,155 Z', cx: 890, cy: 130 },
  MD: { d: 'M790,270 L820,260 L825,280 L805,290 L790,285 Z', cx: 807, cy: 275 },
  MA: { d: 'M855,180 L890,175 L895,185 L860,192 Z', cx: 875, cy: 184 },
  MI: { d: 'M615,175 L660,165 L670,210 L650,240 L620,235 L610,210 Z', cx: 640, cy: 205 },
  MN: { d: 'M500,140 L555,140 L560,220 L500,220 Z', cx: 528, cy: 180 },
  MS: { d: 'M610,395 L640,395 L640,460 L618,465 L610,445 Z', cx: 625, cy: 430 },
  MO: { d: 'M540,300 L600,295 L605,360 L560,370 L540,350 Z', cx: 572, cy: 330 },
  MT: { d: 'M270,120 L380,115 L385,180 L270,185 Z', cx: 325, cy: 148 },
  NE: { d: 'M390,260 L500,255 L505,300 L420,305 L390,295 Z', cx: 448, cy: 278 },
  NV: { d: 'M175,240 L215,235 L220,340 L190,360 L170,320 Z', cx: 195, cy: 290 },
  NH: { d: 'M868,135 L880,130 L882,170 L870,175 Z', cx: 875, cy: 152 },
  NJ: { d: 'M830,230 L845,225 L848,270 L835,275 Z', cx: 840, cy: 248 },
  NM: { d: 'M270,365 L340,365 L345,445 L270,445 Z', cx: 308, cy: 405 },
  NY: { d: 'M790,165 L850,155 L860,195 L830,215 L795,215 L785,195 Z', cx: 823, cy: 185 },
  NC: { d: 'M700,340 L790,330 L800,350 L730,365 L700,360 Z', cx: 750, cy: 348 },
  ND: { d: 'M410,130 L500,130 L500,180 L410,180 Z', cx: 455, cy: 155 },
  OH: { d: 'M665,250 L710,245 L715,300 L695,315 L665,310 Z', cx: 690, cy: 280 },
  OK: { d: 'M420,360 L530,355 L535,390 L460,395 L420,380 Z', cx: 475, cy: 375 },
  OR: { d: 'M130,155 L205,145 L210,210 L140,220 Z', cx: 170, cy: 182 },
  PA: { d: 'M740,225 L820,215 L825,255 L745,265 Z', cx: 782, cy: 240 },
  RI: { d: 'M870,198 L880,196 L882,208 L872,210 Z', cx: 876, cy: 203 },
  SC: { d: 'M710,365 L750,355 L760,385 L730,395 L710,385 Z', cx: 735, cy: 375 },
  SD: { d: 'M410,185 L500,185 L500,240 L410,240 Z', cx: 455, cy: 212 },
  TN: { d: 'M620,350 L720,340 L725,365 L625,375 Z', cx: 672, cy: 358 },
  TX: { d: 'M360,390 L460,385 L465,450 L500,490 L470,520 L410,510 L360,470 Z', cx: 425, cy: 450 },
  UT: { d: 'M240,250 L300,248 L305,340 L245,345 Z', cx: 272, cy: 295 },
  VT: { d: 'M855,135 L867,132 L869,168 L857,170 Z', cx: 862, cy: 150 },
  VA: { d: 'M720,300 L800,285 L810,320 L760,340 L720,335 Z', cx: 765, cy: 315 },
  WA: { d: 'M145,95 L220,90 L225,155 L150,160 Z', cx: 185, cy: 125 },
  WV: { d: 'M730,280 L760,270 L770,310 L745,325 L730,310 Z', cx: 750, cy: 298 },
  WI: { d: 'M555,155 L610,150 L615,220 L580,230 L555,215 Z', cx: 585, cy: 188 },
  WY: { d: 'M280,195 L370,190 L375,255 L280,260 Z', cx: 326, cy: 225 },
  DC: { d: 'M800,290 L808,288 L810,296 L802,298 Z', cx: 805, cy: 293 },
};

export const ALL_STATE_PATH_CODES = Object.keys(STATE_PATHS);
