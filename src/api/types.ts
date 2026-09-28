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
  batch?(statements: Statement[]): Promise<unknown[]>;
}
export interface ObjectBody {
  body: ReadableStream;
  httpEtag?: string;
}
export interface ObjectStore {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: unknown,
  ): Promise<unknown>;
  get(key: string): Promise<ObjectBody | null>;
  delete(key: string): Promise<void>;
}
export interface Bindings {
  DB: Database;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  ACCESS_ISSUER?: string;
  ACCESS_AUDIENCE?: string;
  APP_ORIGIN?: string;
  DOCUMENTS?: ObjectStore;
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
