/**
 * Market Research Configuration
 *
 * Reads search mode preferences from the shared AI config file.
 * Both free (DuckDuckGo) and tavily modes can be enabled simultaneously.
 */

import { readFileSync, existsSync } from 'fs';
import { getDataDir } from '@/lib/data-dir';

export type SearchModes = {
  free: boolean;
  tavily: boolean;
};

const CONFIG_PATH = getDataDir('.admin-ai-config.json');

const DEFAULT_SEARCH_MODES: SearchModes = { free: true, tavily: false };

/**
 * Returns which search modes are currently enabled.
 * Defaults to { free: true, tavily: false } if not configured.
 */
export function getEnabledSearchModes(): SearchModes {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.searchModes && typeof parsed.searchModes === 'object') {
        const modes = parsed.searchModes as Partial<SearchModes>;
        return {
          free: modes.free !== false, // default true
          tavily: modes.tavily === true,
        };
      }
    }
  } catch {
    /* use defaults */
  }
  return { ...DEFAULT_SEARCH_MODES };
}
