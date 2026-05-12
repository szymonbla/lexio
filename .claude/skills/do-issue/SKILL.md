---
name: do-issue
description: Pick the highest-priority open GitHub issue, implement it, verify it, update the PRD, log progress, and commit. Works on exactly ONE issue per run. Use when user wants to make progress on GitHub issues.
---

# Do Issue

Implement a single highest-priority GitHub issue end-to-end.

## Project context

- Root: `/Users/szymon/Programming/lexio`
- Extension sub-project: `extension/` — scripts: `bun run typecheck`, `bun run test`
- Backend sub-project: `backend/` (may not exist yet) — scripts: `bun run typecheck`, `bun run test`
- PRD files: `PRD.md` (main), `PRD-backend-phase1.md` (backend phase 1)
- Issue tracker: GitHub (`gh` CLI available)
- Package manager: **bun** (never npm)

## Process

### 1. Pick the issue

Run `gh issue list --state open` to get all open issues.

Choose the **highest-priority** issue using this logic:
- Issues with a `blocked by` section in their body are blocked if the dependency issue is still open — skip them
- Prefer issues with lower numbers (earlier in sequence = foundational = higher priority)
- An issue explicitly about a PRD overview (#1-style) is meta — skip it, work on concrete implementation issues

Run `gh issue view <number>` on the chosen issue to read its full body and acceptance criteria.

### 2. Check baseline

Before touching code, verify the repo is in a clean state:
- Run typecheck and tests for the **relevant sub-project** only (match by issue content)
- If they fail before your changes, note it in progress.txt and fix the pre-existing failures first before implementing the feature

**Commands by sub-project:**
- Extension: `cd extension && bun run typecheck && bun run test`
- Backend: `cd backend && bun run typecheck && bun run test`
- If sub-project doesn't exist yet (scaffolding issue), skip the baseline check

### 3. Implement

Implement exactly what the issue acceptance criteria describe. No more, no less. Do not refactor adjacent code unless the issue explicitly requires it.

### 4. Verify

Run the relevant sub-project's checks:
```
bun run typecheck
bun run test
```

If typecheck or tests fail, fix them before proceeding. Do **not** skip or comment out failing tests.

### 5. Update PRD

Open the relevant PRD file (`PRD-backend-phase1.md` for backend issues, `PRD.md` for extension issues or anything cross-cutting).

Add a brief note under a `## Progress` section (create it if missing) marking the implemented feature as done. Keep it to one line per issue.

### 6. Log progress

Append to `/Users/szymon/Programming/lexio/progress.txt` (create if missing):

```
[YYYY-MM-DD] Issue #<N> — <issue title>
  Status: DONE
  Notes: <1-2 sentences — what was tricky or non-obvious, or "straightforward">
```

### 7. Close the issue and commit

Close the issue:
```
gh issue close <number> --comment "Implemented in this commit."
```

Stage only files you changed and commit:
```
git add <files>
git commit -m "<short imperative message referencing issue number>"
```

Commit message format: `feat: <what> (#<issue-number>)` or `fix: <what> (#<issue-number>)`.

### 8. Check PRD completion

After committing, re-read the PRD. If **all** user stories and acceptance criteria across all issues are now implemented and verified, output:

```
<promise>COMPLETE</promise>
```

Otherwise, briefly state which issue was completed and which issues remain.
