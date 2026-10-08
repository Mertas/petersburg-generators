import type { GameEventDef, GameState } from '../types';
import { EVENT_DEFS } from './events';

export function triggerEvent(state: GameState): GameEventDef | null {
  const available = EVENT_DEFS.filter(e => !e.precondition || e.precondition(state));
  if (available.length === 0) return null;

  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}
