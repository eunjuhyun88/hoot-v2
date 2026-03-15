import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCliArgs } from "./autoresearch_to_telemetry.ts";

type ManifestWorkspace = {
  workspace: string;
  nodeId: string;
  workerId: string;
  jobId: string;
  experimentId: string;
  region: string;
  gpuLabel: string;
};

type ManifestFile = {
  workspaces: ManifestWorkspace[];
};

type ScopeSpec = {
  id: string;
  title: string;
  objective: string;
  editablePaths: string[];
  gates: string[];
};

type ScopeConfig = {
  scopes: ScopeSpec[];
};

type SupervisorConfig = {
  repoPath: string;
  runtimeRoot: string;
  workspaceRoot: string;
  manifestPath: string;
  controllerPort: number;
  controllerLaunch: boolean;
  controllerTickMs: number;
  workers: number;
  agentExperiments: number;
  preflightOnly: boolean;
  forceLaunch: boolean;
  restartAgents: boolean;
  restartDelayMs: number;
  model?: string;
  scopesPath: string;
};

type Preflight = {
  codex: boolean;
  node: boolean;
  npm: boolean;
  git: boolean;
  ready: boolean;
  blockers: string[];
};

type WorkspaceRuntime = {
  entry: ManifestWorkspace;
  workspaceDir: string;
  statusPath: string;
  stdoutPath: string;
  stderrPath: string;
  lastMessagePath: string;
  scope: ScopeSpec;
  process?: ChildProcess;
  launches: number;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

async function parseConfig(): Promise<SupervisorConfig> {
  const args = parseCliArgs(process.argv.slice(2));
  const runtimeRoot = resolveInputPath(args.get("runtime-root")?.[0] ?? resolve(rootDir, "runtime/repo-refactor-loop-live"));

  return {
    repoPath: resolveInputPath(args.get("repo")?.[0] ?? rootDir),
    runtimeRoot,
    workspaceRoot: resolveInputPath(args.get("workspace-root")?.[0] ?? resolve(runtimeRoot, "workspaces")),
    manifestPath: resolveInputPath(args.get("manifest")?.[0] ?? resolve(runtimeRoot, "manifest.json")),
    controllerPort: Number(args.get("controller-port")?.[0] ?? "8786"),
    controllerLaunch: args.get("launch-controller")?.[0] !== "false",
    controllerTickMs: Math.max(150, Number(args.get("controller-tick-ms")?.[0] ?? "700")),
    workers: Math.max(1, Number(args.get("workers")?.[0] ?? "4")),
    agentExperiments: Math.max(1, Number(args.get("agent-experiments")?.[0] ?? "6")),
    preflightOnly: args.get("preflight-only")?.[0] === "true",
    forceLaunch: args.get("force-launch")?.[0] === "true",
    restartAgents: args.get("restart-agents")?.[0] !== "false",
    restartDelayMs: Math.max(1000, Number(args.get("restart-delay-ms")?.[0] ?? "15000")),
    model: args.get("model")?.[0],
    scopesPath: resolveInputPath(args.get("scopes")?.[0] ?? resolve(rootDir, "config/repo-refactor-scopes.json")),
  };
}

async function main() {
  const config = await parseConfig();
  const scopes = loadScopes(config.scopesPath);
  await mkdir(config.runtimeRoot, { recursive: true });

  const controller = await ensureController(config);
  const manifest = await waitForManifest(config);
  const workspaces = manifest.workspaces.map((entry, index) => createWorkspaceRuntime(config, entry, scopes[index % scopes.length]));
  const preflight = await runPreflight();

  await writeSupervisorState(config, workspaces, preflight);
  await Promise.all(workspaces.map((workspace) => writeBlockedStatus(workspace, preflight, false)));

  console.log(`[repo-supervisor] controller=http://localhost:${config.controllerPort}/events`);
  console.log(`[repo-supervisor] workspaces=${workspaces.length}`);
  console.log(`[repo-supervisor] ready=${preflight.ready}`);

  if (config.preflightOnly || (!preflight.ready && !config.forceLaunch)) {
    if (!preflight.ready) {
      console.log(`[repo-supervisor] blocked: ${preflight.blockers.join(" | ")}`);
    }
    return;
  }

  await Promise.all(workspaces.map((workspace) => launchWorkspaceAgent(config, workspace)));

  const shutdown = () => {
    for (const workspace of workspaces) {
      workspace.process?.kill("SIGTERM");
    }
    controller?.kill("SIGTERM");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

function loadScopes(scopesPath: string): ScopeSpec[] {
  const raw = readFileSync(scopesPath, "utf8");
  const config = JSON.parse(raw) as ScopeConfig;
  if (!Array.isArray(config.scopes) || config.scopes.length === 0) {
    throw new Error(`No scopes found in ${scopesPath}`);
  }
  return config.scopes;
}

async function ensureController(config: SupervisorConfig): Promise<ChildProcess | null> {
  if (await healthzOk(config.controllerPort)) {
    console.log("[repo-supervisor] reusing existing controller");
    return null;
  }

  if (!config.controllerLaunch) {
    throw new Error(`Controller is not reachable on port ${config.controllerPort}.`);
  }

  const controllerScript = resolve(rootDir, "scripts/autoresearch_loop_controller.ts");
  const child = spawn(
    "node",
    [
      "--experimental-strip-types",
      controllerScript,
      `--repo=${config.repoPath}`,
      `--runtime-root=${config.runtimeRoot}`,
      `--workspace-root=${config.workspaceRoot}`,
      `--manifest=${config.manifestPath}`,
      `--workers=${config.workers}`,
      "--mode=watch",
      `--port=${config.controllerPort}`,
      `--tick-ms=${config.controllerTickMs}`,
      "--max-iterations=1000000",
      "--write-telemetry-log=true",
    ],
    {
      cwd: rootDir,
      stdio: ["ignore", "inherit", "inherit"],
    },
  );

  await waitForHealthz(config.controllerPort, 12000);
  return child;
}

async function healthzOk(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${port}/healthz`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealthz(port: number, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await healthzOk(port)) return;
    await sleep(400);
  }
  throw new Error(`Controller did not become healthy on port ${port}.`);
}

async function waitForManifest(config: SupervisorConfig): Promise<ManifestFile> {
  const start = Date.now();
  while (Date.now() - start < 12000) {
    try {
      const raw = await readFile(config.manifestPath, "utf8");
      return JSON.parse(raw) as ManifestFile;
    } catch {
      await sleep(300);
    }
  }
  throw new Error(`Manifest did not appear at ${config.manifestPath}`);
}

function createWorkspaceRuntime(config: SupervisorConfig, entry: ManifestWorkspace, scope: ScopeSpec): WorkspaceRuntime {
  const workspaceDir = resolve(dirname(config.manifestPath), entry.workspace);
  const slug = entry.workerId.replace(/^worker-/, "");
  const logsDir = resolve(config.runtimeRoot, "agent-logs", slug);
  return {
    entry,
    workspaceDir,
    statusPath: resolve(logsDir, "agent_status.md"),
    stdoutPath: resolve(logsDir, "codex.stdout.log"),
    stderrPath: resolve(logsDir, "codex.stderr.log"),
    lastMessagePath: resolve(logsDir, "codex.last.txt"),
    scope,
    launches: 0,
  };
}

async function runPreflight(): Promise<Preflight> {
  const codex = await commandExists("codex");
  const node = await commandExists("node");
  const npm = await commandExists("npm");
  const git = await commandExists("git");
  const blockers: string[] = [];

  if (!codex) blockers.push("codex CLI not found");
  if (!node) blockers.push("node not found");
  if (!npm) blockers.push("npm not found");
  if (!git) blockers.push("git not found");

  return {
    codex,
    node,
    npm,
    git,
    ready: blockers.length === 0,
    blockers,
  };
}

async function launchWorkspaceAgent(config: SupervisorConfig, workspace: WorkspaceRuntime): Promise<void> {
  await mkdir(dirname(workspace.statusPath), { recursive: true });

  const runOnce = async () => {
    workspace.launches += 1;
    const prompt = buildAgentPrompt(workspace, config);
    await writeFile(workspace.statusPath, `# Agent Launching\n\nscope: ${workspace.scope.id}\nlaunches: ${workspace.launches}\n`, "utf8");

    await new Promise<void>((resolvePromise, rejectPromise) => {
      const args = [
        "exec",
        "--dangerously-bypass-approvals-and-sandbox",
        "-C",
        workspace.workspaceDir,
        "-o",
        workspace.lastMessagePath,
      ];
      if (config.model) args.push("-m", config.model);

      const child = spawn("codex", args, {
        cwd: workspace.workspaceDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      workspace.process = child;
      child.stdin.write(prompt);
      child.stdin.end();

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
      child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
      child.on("error", rejectPromise);
      child.on("close", async (code) => {
        await writeFile(workspace.stdoutPath, Buffer.concat(stdoutChunks).toString("utf8"), "utf8");
        await writeFile(workspace.stderrPath, Buffer.concat(stderrChunks).toString("utf8"), "utf8");
        await updateStatusFromLogs(workspace, code ?? 1);
        workspace.process = undefined;

        if (code === 0) {
          resolvePromise();
          return;
        }
        rejectPromise(new Error(`codex exited with code ${code ?? -1}`));
      });
    });
  };

  const loop = async () => {
    for (;;) {
      try {
        await runOnce();
      } catch (error) {
        await appendStatusLine(workspace.statusPath, `launch failed: ${toErrorMessage(error)}`);
      }

      if (!config.restartAgents) return;
      await sleep(config.restartDelayMs);
    }
  };

  void loop();
}

function buildAgentPrompt(workspace: WorkspaceRuntime, config: SupervisorConfig): string {
  return [
    `You are ${workspace.entry.workerId}, one worker in a long-running repo refactor swarm.`,
    `Work only inside this git worktree: ${workspace.workspaceDir}.`,
    `The controller is already running at http://localhost:${config.controllerPort}/events and watches run.log + results.tsv.`,
    `Setup is already done: stay on the current branch, do not create a new branch, and do not wait for human confirmation.`,
    `Read AGENTS.md, memory/MEMORY.md, memory/session-log.md, memory/architecture.md, README.md, and docs/exec-plans/active/continuous-autoresearch-refactor.md before changing code.`,
    `Your scope id is ${workspace.scope.id}.`,
    `Scope objective: ${workspace.scope.objective}`,
    `Editable paths:`,
    ...workspace.scope.editablePaths.map((item) => `- ${item}`),
    `Required gates:`,
    ...workspace.scope.gates.map((gate) => `- ${gate}`),
    `Loop rules:`,
    `- do one scoped refactor experiment at a time`,
    `- run the gates after each experiment`,
    `- if the gates fail, revert that experiment or discard it before the next one`,
    `- only keep changes that improve the repo while staying inside scope`,
    `- update results.tsv and run.log inside the workspace after each experiment`,
    `- you may write untracked notes to agent_status.md`,
    `- stop after ${config.agentExperiments} experiments and summarize the best keep`,
    `Never edit outside the allowed scope except results.tsv, run.log, and agent_status.md.`,
  ].join("\n");
}

async function updateStatusFromLogs(workspace: WorkspaceRuntime, exitCode: number) {
  const lastMessage = await readFile(workspace.lastMessagePath, "utf8").catch(() => "");
  const stdoutTail = await readFile(workspace.stdoutPath, "utf8").then((text) => tail(text, 40)).catch(() => "");
  const body = [
    "# Agent Session",
    "",
    `scope: ${workspace.scope.id}`,
    `exit_code: ${exitCode}`,
    "",
    "## Last Message",
    "",
    "```text",
    lastMessage.trim() || "(empty)",
    "```",
    "",
    "## Stdout Tail",
    "",
    "```text",
    stdoutTail.trim() || "(empty)",
    "```",
    "",
  ].join("\n");

  await writeFile(workspace.statusPath, body, "utf8");
}

async function writeBlockedStatus(workspace: WorkspaceRuntime, preflight: Preflight, launched: boolean) {
  await mkdir(dirname(workspace.statusPath), { recursive: true });
  const body = [
    "# Agent Status",
    "",
    `worker: ${workspace.entry.workerId}`,
    `scope: ${workspace.scope.id}`,
    `workspace: ${workspace.workspaceDir}`,
    `launch_attempted: ${launched}`,
    "",
    "## Preflight",
    "",
    `- codex: ${preflight.codex}`,
    `- node: ${preflight.node}`,
    `- npm: ${preflight.npm}`,
    `- git: ${preflight.git}`,
    "",
    "## Blockers",
    "",
    ...(preflight.blockers.length > 0 ? preflight.blockers.map((blocker) => `- ${blocker}`) : ["- none"]),
    "",
    "## Required Commands",
    "",
    `- \`cd ${workspace.workspaceDir} && npm install\``,
    `- \`cd ${workspace.workspaceDir} && npm run build\``,
    "",
  ].join("\n");

  await writeFile(workspace.statusPath, body, "utf8");
}

async function writeSupervisorState(config: SupervisorConfig, workspaces: WorkspaceRuntime[], preflight: Preflight) {
  const statePath = resolve(config.runtimeRoot, "repo-supervisor-state.json");
  await writeFile(
    statePath,
    `${JSON.stringify({
      controllerPort: config.controllerPort,
      manifestPath: config.manifestPath,
      repoPath: config.repoPath,
      scopesPath: config.scopesPath,
      workers: workspaces.length,
      scopes: workspaces.map((workspace) => ({
        workerId: workspace.entry.workerId,
        scopeId: workspace.scope.id,
      })),
      preflight,
      updatedAt: new Date().toISOString(),
    }, null, 2)}\n`,
    "utf8",
  );
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise<boolean>((resolvePromise) => {
    const child = spawn("sh", ["-lc", `command -v ${command} >/dev/null 2>&1`], { stdio: "ignore" });
    child.on("close", (code) => resolvePromise(code === 0));
    child.on("error", () => resolvePromise(false));
  });
}

async function appendStatusLine(statusPath: string, line: string) {
  const previous = await readFile(statusPath, "utf8").catch(() => "");
  await writeFile(statusPath, `${previous}\n${line}\n`, "utf8");
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveInputPath(inputPath: string): string {
  return isAbsolute(inputPath) ? inputPath : resolve(process.cwd(), inputPath);
}

function tail(text: string, lines: number): string {
  return text.split(/\r?\n/).slice(-lines).join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

await main();
