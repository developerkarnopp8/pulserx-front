export type UserRole = 'coach' | 'athlete' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  /** Só aluno: termos na versão atual ainda não aceitos (abre a tela de consentimento). */
  termsPending?: boolean;
  /** Só aluno: consentimento para dados de saúde (LGPD Art. 11); null = ainda não respondeu. */
  healthConsent?: boolean | null;
}

/** GET /consents/me */
/** Admin: aluno achado pelo e-mail do pedido de exclusão (LGPD Art. 18). */
export interface AthleteLookup {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  coachName: string | null;
  unlinked: boolean;
}

export interface ConsentStatus {
  termsVersion: string;
  termsAccepted: boolean;
  healthConsent: boolean | null;
  healthConsentAt: string | null;
}
