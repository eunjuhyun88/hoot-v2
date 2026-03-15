import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  description?: string;
  scopes: ScopeSpec[];
};

type Options = {
  runtimeRoot: string;
  sourceRoot: string;
  configPath: string;
};

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  for (const argument of argv) {
    if (!argument.startsWith("--")) continue;
    const [key, rawValue] = argument.slice(2).split("=", 2);
    values.set(key, rawValue ?? "true");
  }

  const sourceRoot = path.resolve(values.get("source-root") ?? process.cwd());
  const runtimeRoot = path.resolve(values.get("runtime-root") ?? path.join(sourceRoot, "runtime", "repo-refactor-loop"));
  const configPath = path.resolve(values.get("config") ?? path.join(sourceRoot, "config", "repo-refactor-scopes.json"));
  return { runtimeRoot, sourceRoot, configPath };
}

function writeFile(targetPath: string, content: string) {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, "utf8");
}

function bullets(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function buildProgram(scope: ScopeSpec, sourceRoot: string) {
  return `# ${scope.title}

## Objective

${scope.objective}

## Source Root

\`${sourceRoot}\`

## Editable Paths

${bullets(scope.editablePaths)}

## Required Gates

${bullets(scope.gates)}

## Loop Rule

Do one scoped refactor, run the gates, and keep only if the gates stay green and the score improves.

## Hard Boundaries

- Do not edit outside the listed paths.
- Do not overwrite another worker's scope.
- Prefer additive adapters over broad rewrites.
`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const config = JSON.parse(readFileSync(options.configPath, "utf8")) as ScopeConfig;

  mkdirSync(options.runtimeRoot, { recursive: true });

  writeFile(
    path.join(options.runtimeRoot, "README.md"),
    `# Repo Refactor Runtime Pack

Generated for:

- source root: \`${options.sourceRoot}\`
- runtime root: \`${options.runtimeRoot}\`

Scopes:

${config.scopes.map((scope, index) => `${index + 1}. \`${scope.id}\` — ${scope.title}`).join("\n")}
`,
  );

  writeFile(
    path.join(options.runtimeRoot, "refactor-plan.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      sourceRoot: options.sourceRoot,
      runtimeRoot: options.runtimeRoot,
      configPath: options.configPath,
      scopes: config.scopes,
    }, null, 2),
  );

  for (const scope of config.scopes) {
    const scopeRoot = path.join(options.runtimeRoot, "scopes", scope.id);
    writeFile(path.join(scopeRoot, "program.md"), buildProgram(scope, options.sourceRoot));
    writeFile(path.join(scopeRoot, "results.tsv"), "iteration\tstatus\tscore\tdescription\n");
    writeFile(path.join(scopeRoot, "notes.md"), `# ${scope.title}\n\n- objective: ${scope.objective}\n- current status: not started\n`);
  }

  process.stdout.write(`${options.runtimeRoot}\n`);
}

main();
