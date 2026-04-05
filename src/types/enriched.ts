import type { Budgetplanung, Tischplan, ZeitplanAblauf } from './app';

export type EnrichedBudgetplanung = Budgetplanung & {
  budget_dienstleisterName: string;
};

export type EnrichedZeitplanAblauf = ZeitplanAblauf & {
  zeitplan_locationName: string;
  zeitplan_dienstleisterName: string;
};

export type EnrichedTischplan = Tischplan & {
  tisch_gaesteName: string;
};
