export interface Movement {
  id: string;
  name: string;
  category: string;
  coachId?: string;
  /** Preenchido quando o movimento é do próprio atleta (só ele vê). */
  athleteId?: string;
}

export interface PersonalRecord {
  id: string;
  athleteId: string;
  movementId: string;
  loadKg?: number;
  reps?: number;
  achievedAt: string;
  note?: string;
  movement: Movement;
}
