#!/usr/bin/env bash
set -euo pipefail

# ── Auto-merge: validate → squash-merge → push → cleanup ──
# Usage: npm run safe:merge
#
# Runs from a feature branch. Validates, merges to main, pushes, cleans up.

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT_DIR"

MAIN_BRANCH="main"
BRANCH="$(git branch --show-current 2>/dev/null || echo "unknown")"

# ── Pre-checks ──
if [ "$BRANCH" = "$MAIN_BRANCH" ]; then
  echo "[merge] ERROR: Already on $MAIN_BRANCH. Switch to a feature branch first."
  exit 1
fi

if [ "$BRANCH" = "unknown" ] || [ "$BRANCH" = "HEAD" ]; then
  echo "[merge] ERROR: Detached HEAD state. Checkout a feature branch first."
  exit 1
fi

echo "══════════════════════════════════════"
echo "  Auto-Merge: $BRANCH → $MAIN_BRANCH"
echo "══════════════════════════════════════"
echo ""

# ── Step 1: Check for uncommitted changes ──
echo "[merge] Step 1/7: Checking working tree..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[merge] Uncommitted changes detected. Committing..."
  git add -A
  git commit -m "chore: auto-commit before merge ($BRANCH)"
  echo "[merge] Auto-committed."
else
  echo "[merge] Working tree clean."
fi

# ── Step 2: Build validation ──
echo ""
echo "[merge] Step 2/7: Build validation..."
if ! npm run build 2>&1; then
  echo "[merge] ERROR: Build failed. Fix errors before merging."
  exit 1
fi
echo "[merge] Build passed."

# ── Step 3: Sync with origin/main ──
echo ""
echo "[merge] Step 3/7: Syncing with origin/$MAIN_BRANCH..."
git fetch origin
if ! git merge-base --is-ancestor "origin/$MAIN_BRANCH" HEAD 2>/dev/null; then
  echo "[merge] Rebasing onto origin/$MAIN_BRANCH..."
  if ! git rebase "origin/$MAIN_BRANCH"; then
    echo "[merge] ERROR: Rebase conflict. Resolve manually, then re-run."
    echo "[merge] To abort: git rebase --abort"
    exit 1
  fi
  echo "[merge] Rebase complete."

  # Re-validate build after rebase
  echo "[merge] Re-validating build after rebase..."
  if ! npm run build 2>&1; then
    echo "[merge] ERROR: Build failed after rebase. Fix errors."
    exit 1
  fi
else
  echo "[merge] Already up to date with origin/$MAIN_BRANCH."
fi

# ── Step 4: Merge to main (fast-forward only) ──
echo ""
echo "[merge] Step 4/7: Merging to $MAIN_BRANCH..."
git checkout "$MAIN_BRANCH"
git pull --ff-only origin "$MAIN_BRANCH" 2>/dev/null || true

if ! git merge --ff-only "$BRANCH"; then
  echo "[merge] WARNING: Fast-forward not possible. Using squash merge..."
  git merge --squash "$BRANCH"
  git commit -m "feat: merge $BRANCH into $MAIN_BRANCH (squash)"
fi
echo "[merge] Merged."

# ── Step 5: Push to origin ──
echo ""
echo "[merge] Step 5/7: Pushing to origin/$MAIN_BRANCH..."
git push origin "$MAIN_BRANCH"
echo "[merge] Pushed."

# ── Step 6: Delete local branch ──
echo ""
echo "[merge] Step 6/7: Cleaning up local branch..."
git branch -d "$BRANCH" 2>/dev/null && echo "[merge] Deleted local: $BRANCH" || echo "[merge] Local branch already removed."

# ── Step 7: Delete remote branch (if exists) ──
echo ""
echo "[merge] Step 7/7: Cleaning up remote branch..."
if git ls-remote --heads origin "$BRANCH" 2>/dev/null | grep -q .; then
  git push origin --delete "$BRANCH" 2>/dev/null && echo "[merge] Deleted remote: origin/$BRANCH" || echo "[merge] Remote branch already removed."
else
  echo "[merge] No remote branch to delete."
fi

# Prune worktree if applicable
git worktree prune 2>/dev/null || true

echo ""
echo "══════════════════════════════════════"
echo "  Merge complete: $BRANCH → $MAIN_BRANCH"
echo "══════════════════════════════════════"
