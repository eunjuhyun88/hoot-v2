#!/usr/bin/env bash
set -euo pipefail

# ── Cleanup stale branches and worktrees ──
# Usage:
#   npm run safe:cleanup            # dry-run (show what would be deleted)
#   npm run safe:cleanup -- --force  # actually delete

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

MAIN_BRANCH="main"
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=true ;;
    *) echo "[cleanup] unknown arg: $arg"; exit 1 ;;
  esac
done

echo "══════════════════════════════════════"
echo "  Stale Branch & Worktree Cleanup"
echo "══════════════════════════════════════"
echo ""

# ── 1. Find merged branches ──
echo "── Merged branches (candidates for deletion) ──"
MERGED_BRANCHES=()
while IFS= read -r branch; do
  branch="$(echo "$branch" | sed 's/^[* +]*//' | xargs)"  # trim markers + whitespace
  # Skip main, HEAD, and current branch
  [[ "$branch" == "$MAIN_BRANCH" ]] && continue
  [[ -z "$branch" ]] && continue
  MERGED_BRANCHES+=("$branch")
  echo "  - $branch"
done < <(git branch --merged "$MAIN_BRANCH" 2>/dev/null)

if [ ${#MERGED_BRANCHES[@]} -eq 0 ]; then
  echo "  (none)"
fi
echo ""

# ── 2. Find stale worktrees ──
echo "── Worktrees ──"
STALE_WORKTREES=()
while IFS= read -r line; do
  wt_path="$(echo "$line" | awk '{print $1}')"
  wt_branch="$(echo "$line" | sed -n 's/.*\[\(.*\)\].*/\1/p' || true)"

  # Skip main worktree
  [[ "$wt_path" == "$ROOT_DIR" ]] && continue
  [[ -z "$wt_path" ]] && continue

  # Check if this worktree's branch is merged
  is_merged=false
  for mb in "${MERGED_BRANCHES[@]+"${MERGED_BRANCHES[@]}"}"; do
    if [[ "$mb" == "$wt_branch" ]]; then
      is_merged=true
      break
    fi
  done

  if $is_merged; then
    STALE_WORKTREES+=("$wt_path")
    echo "  STALE: $wt_path ($wt_branch) — merged"
  else
    echo "  ACTIVE: $wt_path ($wt_branch)"
  fi
done < <(git worktree list 2>/dev/null)

if [ ${#STALE_WORKTREES[@]} -eq 0 ] && [ ${#MERGED_BRANCHES[@]} -eq 0 ]; then
  echo ""
  echo "[cleanup] Nothing to clean up."
  exit 0
fi

echo ""

# ── 3. Check stale remotes ──
echo "── Stale remote tracking branches ──"
PRUNE_OUTPUT="$(git remote prune origin --dry-run 2>/dev/null || true)"
if [ -n "$PRUNE_OUTPUT" ]; then
  echo "$PRUNE_OUTPUT"
else
  echo "  (none)"
fi
echo ""

# ── 4. Execute or dry-run ──
if ! $FORCE; then
  echo "══════════════════════════════════════"
  echo "  DRY RUN — no changes made"
  echo "  Run with --force to delete"
  echo "══════════════════════════════════════"
  exit 0
fi

echo "══════════════════════════════════════"
echo "  EXECUTING CLEANUP"
echo "══════════════════════════════════════"
echo ""

# Remove stale worktrees first (before deleting branches)
for wt in "${STALE_WORKTREES[@]+"${STALE_WORKTREES[@]}"}"; do
  echo "[cleanup] Removing worktree: $wt"
  git worktree remove "$wt" --force 2>/dev/null || echo "  (already removed or locked)"
done

# Delete merged local branches
for branch in "${MERGED_BRANCHES[@]+"${MERGED_BRANCHES[@]}"}"; do
  echo "[cleanup] Deleting local branch: $branch"
  git branch -d "$branch" 2>/dev/null || echo "  (already deleted)"
done

# Delete merged remote branches (only codex/ and claude/ prefixed)
for branch in "${MERGED_BRANCHES[@]+"${MERGED_BRANCHES[@]}"}"; do
  if [[ "$branch" == codex/* ]] || [[ "$branch" == claude/* ]] || [[ "$branch" == feat/* ]]; then
    if git ls-remote --heads origin "$branch" 2>/dev/null | grep -q .; then
      echo "[cleanup] Deleting remote branch: origin/$branch"
      git push origin --delete "$branch" 2>/dev/null || echo "  (already deleted on remote)"
    fi
  fi
done

# Prune stale remote refs
echo "[cleanup] Pruning stale remote refs..."
git remote prune origin 2>/dev/null || true

# Clean up worktree metadata
git worktree prune 2>/dev/null || true

echo ""
echo "[cleanup] Done."
