import { readdirSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

type ScopeSpec = {
  id: string;
  title: string;
  objective: string;
  editablePaths: string[];
  gates: string[];
};

type ScopeConfig = {
  version: number;
  scopes: ScopeSpec[];
};

type CliOptions = {
  scopeId: string | null;
  json: boolean;
  skipBuild: boolean;
  configPath: string;
  cwd: string;
};

function parseArgs(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (const argument of argv) {
    if (!argument.startsWith("--")) continue;
    const [key, value] = argument.slice(2).split("=", 2);
    values.set(key, value ?? "true");
  }

  return {
    scopeId: values.get("scope-id") ?? null,
    json: values.get("json") === "true",
    skipBuild: values.get("skip-build") === "true",
    configPath: path.resolve(values.get("config") ?? "config/repo-refactor-scopes.json"),
    cwd: process.cwd(),
  };
}

function run(command: string, args: string[], cwd: string) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

function loadScope(configPath: string, scopeId: string | null): ScopeSpec | null {
  if (!scopeId) return null;
  const raw = readFileSync(configPath, "utf8");
  const config = JSON.parse(raw) as ScopeConfig;
  return config.scopes.find((scope) => scope.id === scopeId) ?? null;
}

function listChangedFiles(cwd: string): string[] {
  const result = run("git", ["status", "--porcelain", "--untracked-files=all"], cwd);
  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.slice(3).trim())
    .filter((file) =>
      file &&
      !file.startsWith(".agent-context/") &&
      !file.startsWith("memory/") &&
      !file.startsWith("runtime/") &&
      !file.startsWith("dist/") &&
      !file.endsWith(".sqlite") &&
      !file.endsWith(".sqlite-shm") &&
      !file.endsWith(".sqlite-wal"))
    .sort();
}

function changedFilesAllowed(files: string[], scope: ScopeSpec | null) {
  if (!scope) {
    return {
      allowed: true,
      violations: [] as string[],
    };
  }

  const violations = files.filter((file) => !scope.editablePaths.some((prefix) => file === prefix || file.startsWith(`${prefix}/`)));
  return {
    allowed: violations.length === 0,
    violations,
  };
}

function collectBuildArtifacts(cwd: string) {
  const distAssets = path.join(cwd, "dist", "assets");
  let jsBytes = 0;
  let cssBytes = 0;

  try {
    for (const entry of readdirSync(distAssets)) {
      const fullPath = path.join(distAssets, entry);
      const size = statSync(fullPath).size;
      if (entry.endsWith(".js")) jsBytes += size;
      if (entry.endsWith(".css")) cssBytes += size;
    }
  } catch {
    return { jsBytes: 0, cssBytes: 0 };
  }

  return { jsBytes, cssBytes };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const scope = loadScope(options.configPath, options.scopeId);
  const changedFiles = listChangedFiles(options.cwd);
  const scopeCheck = changedFilesAllowed(changedFiles, scope);

  let buildOk = true;
  let buildStdout = "";
  let buildStderr = "";

  if (!options.skipBuild) {
    const build = run("npm", ["run", "build"], options.cwd);
    buildOk = build.status === 0;
    buildStdout = build.stdout;
    buildStderr = build.stderr;
  }

  const artifacts = collectBuildArtifacts(options.cwd);
  const touchedFileCount = changedFiles.length;

  let score = 0;
  if (buildOk) score += 70;
  if (scopeCheck.allowed) score += 20;
  if (touchedFileCount > 0) score += 10;
  if (touchedFileCount > 12) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const result = {
    scopeId: scope?.id ?? null,
    scopeTitle: scope?.title ?? null,
    buildOk,
    scopeOk: scopeCheck.allowed,
    keep: buildOk && scopeCheck.allowed,
    score,
    touchedFileCount,
    changedFiles,
    violations: scopeCheck.violations,
    bundle: {
      jsBytes: artifacts.jsBytes,
      cssBytes: artifacts.cssBytes,
    },
    summary: buildOk && scopeCheck.allowed
      ? `keep: build passed and changes stayed inside scope (${score})`
      : !buildOk
        ? `discard: build failed (${score})`
        : `discard: scope violations (${score})`,
    buildTail: tailText(`${buildStdout}\n${buildStderr}`, 40),
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${result.summary}\n`);
  process.stdout.write(`changed files: ${touchedFileCount}\n`);
  if (result.violations.length > 0) {
    process.stdout.write(`violations:\n- ${result.violations.join("\n- ")}\n`);
  }
}

function tailText(text: string, lines: number): string {
  return text.split(/\r?\n/).slice(-lines).join("\n").trim();
}

main();
