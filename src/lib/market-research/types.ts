/**
 * Market Research — Type Definitions
 *
 * Types shared across the market research agent system.
 * Supports dual search mode: free (no API key) and tavily (API key required).
 */

export type SearchMode = 'free' | 'tavily';

export type ResearchSignal = {
  source: string; // "TikTok", "Amazon", "AliExpress", etc.
  indicator: string; // "47K videos in 30d", "4.8★ avg rating", etc.
  strength: 'strong' | 'moderate' | 'weak';
};

export type ResearchResult = {
  id: string;
  title: string;
  description: string;
  scores: {
    trend: number; // 0-100
    demand: number; // 0-100
    competition: number; // 0-100 (100 = blue ocean, low competition)
    margin: number; // 0-100
    overall: number; // weighted composite
  };
  signals: ResearchSignal[];
  priceRange: { supplier: string; retail: string; marginPercent: string };
  recommendation: 'hot' | 'promising' | 'saturated' | 'pass';
  reasoning: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  researchedAt: number;
};

export type ResearchSession = {
  id: string;
  query: string;
  category?: string;
  searchMode: SearchMode;
  status: 'pending' | 'running' | 'complete' | 'failed';
  results: ResearchResult[];
  summary?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
};
