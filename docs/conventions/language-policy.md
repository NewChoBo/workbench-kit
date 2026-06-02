# Language Policy

English is the project documentation language. Public source should stay
English-only so docs, changelogs, releases, and examples do not drift across
translations.

## Use English For

- Public documentation
- Commit summaries and commit bodies
- Release notes and changelogs
- Package metadata
- Storybook story titles and public examples
- Public API names and user-facing component copy

## Korean Notes

Korean can be used in conversations, implementation discussions, and temporary
local planning. Do not add tracked Korean translations unless the project
explicitly decides to support documentation localization as a maintained
deliverable.

Avoid partial bilingual documentation. It creates review overhead and stale
translation risk without enough value for the current package stage.

## Commit Messages

Commit messages use English Conventional Commits:

```text
docs(conventions): use English-only project documentation

Set English as the project language for public docs and commits to avoid
translation drift.

Validation: pnpm validate passed.
```

Do not rewrite old commits only to change language. Apply this policy to new
commits and docs from this point forward.
