# Team GitHub Workflow

This document records the collaboration workflow for ClinTrace AI.

## Branching Strategy

- `main` contains releasable code only.
- New work starts from `main` on a short-lived feature branch.
- Branch names use `feature/[description]`, `fix/[description]`, `docs/[description]`, `refactor/[description]`, or `chore/[description]`.
- Branches are deleted after their pull requests are merged.

## Commit Message Convention

Commit messages use the format `[type]: [description]`.

The team uses these types:

- `feat`: adds a user-facing capability.
- `fix`: corrects broken behavior.
- `docs`: changes documentation only.
- `refactor`: improves structure without changing behavior.
- `chore`: updates tooling or maintenance files.

This format supports automated changelog generation and keeps the project history clear.

## GitHub Issue Tracking

- Every feature or fix starts with a GitHub issue.
- Each issue includes a clear description, a relevant label, and one accountable assignee.
- Issues are closed when the corresponding pull request is merged.