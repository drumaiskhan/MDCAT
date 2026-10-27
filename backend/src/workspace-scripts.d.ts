// Type shim: `@workspace/scripts` is bundled by esbuild (build.mjs resolves it)
// but is not listed in this package's dependencies, so tsc can't find it.
// The bundled maintenance-script API surface is declared here.
// Keep in step with scripts/src/mysql-restore/restore.ts.
declare module "@workspace/scripts/mysql-restore/restore" {
  export class MysqlTargetHasDataError extends Error {
    readonly anchorTable: string;
    constructor(anchorTable: string);
  }
  export function testMysqlConnection(url: string): Promise<{ ok: true } | { ok: false; error: string }>;
  export function validateForMysql(
    raw: unknown,
    url?: string,
  ): Promise<{ valid: boolean; scope?: string; targetHasExistingData: boolean; [key: string]: unknown }>;
  export function restoreToMysql(
    raw: unknown,
    url: string,
    mode: "restore-empty" | "wipe-and-restore",
  ): Promise<{ scope: string; mode: string; restored: unknown; [key: string]: unknown }>;
}

