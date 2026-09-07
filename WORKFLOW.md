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

## Pull Request Review Process

- Pull requests require at least one approval before merging into `main`.
- Reviewers check correctness, clarity, data integrity, and test coverage.
- Commit messages are reviewed as part of the code review.
- Pull requests link their issue with `Closes #[issue-number]` or `Fixes #[issue-number]`.

## Contributing From a Fresh Clone

1. Clone the repository and move into the project directory.
2. Create a branch from the latest `main` using the naming convention above.
3. Make the change, run the relevant checks, and commit with a conventional message.
4. Push the branch and open a pull request linked to its issue.
5. Address review feedback and merge only after approval.