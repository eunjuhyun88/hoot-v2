#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

BRANCH="$(git branch --show-current 2>/dev/null || echo "unknown")"

if [ "$BRANCH" = "main" ]; then
	echo ""
	echo "[agent:guard] ⚠️  main 브랜치 감지. 작업하려면 feature 브랜치로 전환 필요."
	echo "[agent:guard] → npm run safe:worktree -- <task-slug>"
	echo "[agent:guard] 머지: npm run safe:merge (feature branch에서)"
	echo "[agent:guard] 정리: npm run safe:cleanup"
	echo ""
fi

if [ -f "scripts/dev/agent-guard.mjs" ]; then
	node scripts/dev/agent-guard.mjs
fi

echo "[memento] Start order: README.md -> AGENTS.md -> docs/README.md -> ARCHITECTURE.md -> relevant canonical docs."
echo "[agent] Global rule: one agent = one feature branch (codex/|claude/|feat/) = one claim = one scoped path set."
echo "[agent] Global rule: completed scoped work → npm run safe:merge (fetch → rebase → build → ff-merge → push → cleanup)."

if [ -f "scripts/dev/context-restore.sh" ]; then
	if OUTPUT="$(bash scripts/dev/context-restore.sh --mode brief 2>/dev/null)"; then
		echo
		echo "[memento] Latest branch brief:"
		printf '%s\n' "$OUTPUT" | sed -n '1,120p'
	else
		echo "[memento] No branch brief yet. Create a semantic checkpoint before non-trivial work."
		echo "[memento] Example: npm run ctx:checkpoint -- --work-id \"W-...\" --surface \"<surface>\" --objective \"<objective>\""
	fi
fi

if [ -f "scripts/dev/context-autopilot.mjs" ]; then
	node scripts/dev/context-autopilot.mjs session-start >/dev/null 2>&1 || true
fi
