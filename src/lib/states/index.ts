/**
 * State Intelligence — Public API
 *
 * Re-exports all public types, data, scoring, pulse, and store functions.
 * Import from '@/lib/states' — never import internal files directly.
 */

// Types
export type {
  UsRegion,
  AgeDistribution,
  StateProfile,
  ScoreBreakdown,
  OpportunityScore,
  StateWithScore,
  StateScoreMap,
  PulseSeverity,
  MarketPulseEvent,
  StateTrendSnapshot,
  StatesListResponse,
  StateDetailResponse,
  PulseListResponse,
  PulseMarkReadRequest,
  PulseMarkReadResponse,
  CompareResponse,
  ApiErrorResponse,
  ScoreQuintile,
} from './types';

export { scoreToQuintile, QUINTILE_COLORS, QUINTILE_BG_COLORS } from './types';

// Static data
export {
  STATE_PROFILES,
  ALL_STATE_CODES,
  STATE_COUNT,
  getStateProfile,
  getAllStateProfiles,
} from './data';

// Scoring
export type { TrendDataForScoring, OpportunityLabel } from './scorer';
export {
  normalizeAcrossStates,
  computeOpportunityScore,
  computeAllScores,
  getTopStates,
  getOpportunityLabel,
} from './scorer';

// Pulse
export type { CategoryLabelResolver } from './pulse';
export {
  classifySeverity,
  getWeekStart,
  getPreviousWeekStart,
  calculateDelta,
  detectPulseEvents,
  filterSignificantEvents,
} from './pulse';

// Store
export {
  loadScores,
  saveScores,
  getScoreByState,
  loadSnapshots,
  saveSnapshot,
  getSnapshotsByState,
  getSnapshotsByWeek,
  getLatestWeek,
  getPreviousWeek,
  loadPulseEvents,
  savePulseEvents,
  addPulseEvents,
  markPulseEventsRead,
  getUnreadPulseCount,
  getPulseEventsByState,
  getPulseEventsBySeverity,
} from './store';

// ─── Convenience: State with Score builder ────────────────────────────────────

import type { StateWithScore, OpportunityScore } from './types';
import { getAllStateProfiles } from './data';

/**
 * Build StateWithScore[] from profiles + scores.
 * Used by API routes to compose the response.
 */
export function buildStatesWithScores(scores: OpportunityScore[]): StateWithScore[] {
  const profiles = getAllStateProfiles();
  const scoreMap = new Map(scores.map((s) => [s.stateCode, s]));

  return profiles.map((profile) => {
    const score = scoreMap.get(profile.code) ?? {
      stateCode: profile.code,
      score: 0,
      breakdown: { demographics: 0, trendActivity: 0, ecommerceIndex: 0, incomeIndex: 0 },
      topCategories: [],
      computedAt: 0,
    };
    return { ...profile, opportunityScore: score };
  });
}
