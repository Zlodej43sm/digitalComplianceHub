import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { Authenticate, Bindings, Identity } from './types.ts';

export function accessConfiguration(env: Bindings) {
  if (
    !env.ACCESS_ISSUER ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_ISSUER) ||
    !env.ACCESS_AUDIENCE ||
    !/^[a-f0-9]{64}$/.test(env.ACCESS_AUDIENCE) ||
    !env.APP_ORIGIN ||
    new URL(env.APP_ORIGIN).origin !== env.APP_ORIGIN ||
    !env.APP_ORIGIN.startsWith('https://')
  )
    throw new Error('Access is not configured');
  return {
    issuer: env.ACCESS_ISSUER,
    audience: env.ACCESS_AUDIENCE,
    origin: env.APP_ORIGIN,
  };
}

export async function verifyAssertion(
  token: string,
  issuer: string,
  audience: string,
  key: JWTVerifyGetKey,
): Promise<Identity> {
  const { payload } = await jwtVerify(token, key, {
    issuer,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['sub', 'exp', 'iat'],
    maxTokenAge: '1h',
    clockTolerance: 0,
  });
  if (!payload.sub || payload.type !== 'app' || !payload.exp)
    throw new Error('Invalid identity');
  return { issuer, subject: payload.sub, expiresAt: payload.exp * 1000 };
}

const keySets = new Map<string, JWTVerifyGetKey>();
export const authenticateAccess: Authenticate = async (request, env) => {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const { issuer, audience, origin } = accessConfiguration(env);
  if (new URL(request.url).origin !== origin) return null;
  let keys = keySets.get(issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
      timeoutDuration: 5000,
    });
    keySets.set(issuer, keys);
  }
  try {
    return await verifyAssertion(token, issuer, audience, keys);
  } catch {
    return null;
  }
};
