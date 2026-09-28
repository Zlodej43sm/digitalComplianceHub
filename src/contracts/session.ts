import type { Role } from '../domain/case.ts';

export interface Session {
  userId: string;
  displayName: string;
  bankId: string;
  role: Role;
  organizations: { id: string; name: string }[];
  expiresAt: number;
  mode: 'local' | 'access';
}
