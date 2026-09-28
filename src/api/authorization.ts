import type { Session } from '../contracts/session.ts';
import type { Role } from '../domain/case.ts';
import type { Database, Identity } from './types.ts';

export async function resolveSession(
  db: Database,
  identity: Identity,
  mode: Session['mode'],
): Promise<Session | null> {
  const member = await db
    .prepare(
      `SELECT u.id AS userId, u.display_name AS displayName,
    m.bank_id AS bankId, m.role, m.organization_id AS organizationId
    FROM users u JOIN memberships m ON m.user_id = u.id
    WHERE u.issuer = ? AND u.subject = ? AND u.active = 1`,
    )
    .bind(identity.issuer, identity.subject)
    .first<{
      userId: string;
      displayName: string;
      bankId: string;
      role: Role;
      organizationId: string | null;
    }>();
  if (
    !member ||
    !['client', 'manager', 'compliance', 'demo-admin'].includes(member.role)
  )
    return null;
  const organizations =
    member.role === 'demo-admin'
      ? []
      : (
          await db
            .prepare(
              `SELECT o.id, o.name FROM organizations o
    WHERE o.bank_id = ? AND ( (? = 'client' AND o.id = ?) OR
      (? IN ('manager','compliance') AND EXISTS (SELECT 1 FROM staff_assignments s
        WHERE s.user_id = ? AND s.bank_id = o.bank_id AND s.organization_id = o.id))) ORDER BY o.id`,
            )
            .bind(
              member.bankId,
              member.role,
              member.organizationId,
              member.role,
              member.userId,
            )
            .all<{ id: string; name: string }>()
        ).results;
  return {
    userId: member.userId,
    displayName: member.displayName,
    bankId: member.bankId,
    role: member.role,
    organizations,
    expiresAt: identity.expiresAt,
    mode,
  };
}

export function canReadOrganization(
  session: Session,
  bankId: string,
  organizationId: string,
): boolean {
  return (
    ['client', 'manager', 'compliance'].includes(session.role) &&
    session.bankId === bankId &&
    session.organizations.some((org) => org.id === organizationId)
  );
}

export function allowedMutation(request: Request, origin: string): boolean {
  return (
    request.headers.get('Origin') === origin &&
    ['same-origin', null].includes(request.headers.get('Sec-Fetch-Site')) &&
    request.headers.get('X-CSRF-Protection') === '1' &&
    request.headers.get('Content-Type')?.split(';')[0]?.trim() ===
      'application/json'
  );
}
