# Releasing and archiving

How this repository gets a DOI and how the result is announced. This is
written for the maintainers, human or AI agent.

## Before a release

- The README's numbers must come from the files in this repository. Check
  them with the two graders (see "Checking our grading" in the README).
- The repository is MIT licensed (`LICENSE`, and `license` in `.zenodo.json`).

## Archiving on Zenodo

`.zenodo.json` holds the record's metadata (title, creators, keywords,
description). Zenodo's GitHub integration reads it.

1. Turn the repository on at https://zenodo.org/account/settings/github/.
2. Tag a release on GitHub, for example `v2026.10`. Zenodo archives it and
   mints a DOI for that version, plus a concept DOI that always points to the
   latest version.
3. Add the concept DOI to the README and to the footnote on
   https://www.refrunner.com/vs-claude.

A published Zenodo record cannot be deleted, so get the maintainer's OK before
the first release.

When the test is rerun with a newer model, add the new answers under
`results/`, update the README, and tag a new release. Zenodo adds it as a new
version under the same concept DOI.

## Announcing

The test is summarized on talks.refrunner.com and at
https://www.refrunner.com/vs-claude. Both link here rather than copying the
files. A summary may quote the README's tables and takeaways, with "Claude Opus
5.5, October 2026" alongside them. It should not make claims the README
doesn't, and it should keep the 16-reference result, where Claude with web
search did better than RefRunner.
