# Language Policy

English is the canonical language for public project communication.

## Canonical English

Use English for:

- Public documentation
- Commit summaries and commit bodies
- Release notes and changelogs
- Package metadata
- Storybook story titles and public examples
- Public API names and user-facing component copy

English docs are the source of truth. If a Korean companion document disagrees
with the English document, update the English document first and then refresh
the Korean companion.

## Korean Companion Docs

Korean companion docs may be provided for local onboarding and collaboration.
They should live beside or under the canonical document in a predictable place:

- `README.md` -> `README.ko.md`
- `docs/conventions/*.md` -> `docs/ko/conventions/*.md`

Korean companion docs should avoid adding decisions that are not present in the
English canonical version.

## Commit Messages

Commit messages use English Conventional Commits:

```text
docs(conventions): adopt bilingual documentation policy

Set English as the canonical language for public docs and commits, while keeping
Korean companion docs for local onboarding.

Validation: pnpm validate passed.
```

Do not rewrite old commits only to change language. Apply the policy to new
commits from this point forward.
