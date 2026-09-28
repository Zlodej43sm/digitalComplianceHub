import type { Session } from '../contracts/session.ts';

// Structural subset shared by D1 and the SQLite integration-test adapter.
export interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}
export interface Database {
  prepare(sql: string): Statement;
}
export interface Bindings {
  DB: Database;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  ACCESS_ISSUER?: string;
  ACCESS_AUDIENCE?: string;
  APP_ORIGIN?: string;
}
export interface Identity {
  issuer: string;
  subject: string;
  expiresAt: number;
}
export type Authenticate = (
  request: Request,
  env: Bindings,
) => Promise<Identity | null>;
export type AppEnv = { Bindings: Bindings; Variables: { session: Session } };
