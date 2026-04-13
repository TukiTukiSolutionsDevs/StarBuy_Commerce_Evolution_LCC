/**
 * Unit tests — states/data.ts
 *
 * Validates the static US state dataset for completeness and integrity.
 * Pure data checks — no I/O, no mocks.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import {
  STATE_PROFILES,
  ALL_STATE_CODES,
  STATE_COUNT,
  getStateProfile,
  getAllStateProfiles,
} from './data';
import type { UsRegion } from './types';

// ─── Dataset completeness ─────────────────────────────────────────────────────

describe('dataset completeness', () => {
  it('contains exactly 51 entries (50 states + DC)', () => {
    expect(STATE_COUNT).toBe(51);
    expect(ALL_STATE_CODES).toHaveLength(51);
    expect(Object.keys(STATE_PROFILES)).toHaveLength(51);
  });

  it('includes DC', () => {
    expect(STATE_PROFILES.DC).toBeDefined();
    expect(STATE_PROFILES.DC.name).toBe('District of Columbia');
  });

  it('includes all major states', () => {
    const majors = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];
    for (const code of majors) {
      expect(STATE_PROFILES[code]).toBeDefined();
    }
  });

  it('ALL_STATE_CODES matches STATE_PROFILES keys', () => {
    expect(ALL_STATE_CODES.sort()).toEqual(Object.keys(STATE_PROFILES).sort());
  });
});

// ─── Data integrity ───────────────────────────────────────────────────────────

describe('data integrity', () => {
  const profiles = getAllStateProfiles();

  it('every profile has a 2-letter code matching its key', () => {
    for (const [key, profile] of Object.entries(STATE_PROFILES)) {
      expect(profile.code).toBe(key);
      expect(profile.code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('every profile has a non-empty name', () => {
    for (const p of profiles) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it('every profile has a valid region', () => {
    const validRegions: UsRegion[] = ['West', 'Southwest', 'Midwest', 'Southeast', 'Northeast'];
    for (const p of profiles) {
      expect(validRegions).toContain(p.region);
    }
  });

  it('population is positive for all states', () => {
    for (const p of profiles) {
      expect(p.population).toBeGreaterThan(0);
    }
  });

  it('medianIncome is within realistic range ($30k-$120k)', () => {
    for (const p of profiles) {
      expect(p.medianIncome).toBeGreaterThanOrEqual(30000);
      expect(p.medianIncome).toBeLessThanOrEqual(120000);
    }
  });

  it('urbanizationPct is 0-100 for all states', () => {
    for (const p of profiles) {
      expect(p.urbanizationPct).toBeGreaterThanOrEqual(0);
      expect(p.urbanizationPct).toBeLessThanOrEqual(100);
    }
  });

  it('ecommerceIndex is 0-100 for all states', () => {
    for (const p of profiles) {
      expect(p.ecommerceIndex).toBeGreaterThanOrEqual(0);
      expect(p.ecommerceIndex).toBeLessThanOrEqual(100);
    }
  });

  it('age distribution sums to ~100% for each state (±1% tolerance)', () => {
    for (const p of profiles) {
      const sum =
        p.ageDistribution.under18 +
        p.ageDistribution.age18to34 +
        p.ageDistribution.age35to54 +
        p.ageDistribution.age55plus;
      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    }
  });

  it('dataYear is 2023 for all entries', () => {
    for (const p of profiles) {
      expect(p.dataYear).toBe(2023);
    }
  });
});

// ─── getStateProfile ──────────────────────────────────────────────────────────

describe('getStateProfile', () => {
  it('returns profile for valid uppercase code', () => {
    const ca = getStateProfile('CA');
    expect(ca).toBeDefined();
    expect(ca!.name).toBe('California');
  });

  it('returns profile for lowercase code (case-insensitive)', () => {
    const tx = getStateProfile('tx');
    expect(tx).toBeDefined();
    expect(tx!.name).toBe('Texas');
  });

  it('returns undefined for invalid code', () => {
    expect(getStateProfile('ZZ')).toBeUndefined();
    expect(getStateProfile('')).toBeUndefined();
  });
});

// ─── getAllStateProfiles ──────────────────────────────────────────────────────

describe('getAllStateProfiles', () => {
  it('returns an array of 51 profiles', () => {
    expect(getAllStateProfiles()).toHaveLength(51);
  });

  it('every element is a StateProfile with required fields', () => {
    for (const p of getAllStateProfiles()) {
      expect(p).toHaveProperty('code');
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('region');
      expect(p).toHaveProperty('population');
      expect(p).toHaveProperty('medianIncome');
      expect(p).toHaveProperty('ecommerceIndex');
      expect(p).toHaveProperty('ageDistribution');
    }
  });
});
