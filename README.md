# Can Claude check a reference list? RefRunner vs. Claude, October 2026

We gave Claude (Opus 5.5) and [RefRunner](https://www.refrunner.com) the same
reference lists, with problems planted in them, and graded what each one
caught. This repository holds everything needed to check our grading or run
the test again: the lists, the answer keys, every raw answer, and the
scripts.

It was prompted by a journal board that declined RefRunner because its
members "already use Claude for reference checking". That is a fair
question, so we measured it.

## The 85-reference test

The list: 65 accurate references (62 cited in 2025 _International Journal of
Artificial Intelligence in Education_ papers, plus 3 _Journal of Learning
Analytics_ papers published July–August 2026, after Claude's training data),
6 papers retracted between March and October 2026, 6 invented references,
and 8 real papers with one thing wrong (2 titles, the authors, 2 years, the
journal, the pages, the DOI). That makes 20 problems.

| Setup                                     | Problems found (of 20) | Retractions (of 6) | Time  | API-price estimate |
| ----------------------------------------- | ---------------------- | ------------------ | ----- | ------------------ |
| Claude, plain chat                        | 12                     | 0                  | 48 s  | $0.19              |
| Claude with web search, run 1             | 19                     | 6                  | 203 s | $1.10              |
| Claude with web search, run 2             | 20                     | 6                  | 213 s | $1.12              |
| Claude with web search, run 3             | 18                     | 6                  | 209 s | $1.18              |
| Claude, told to search every entry, run 1 | 20                     | 6                  | 348 s | $2.20              |
| Claude, told to search every entry, run 2 | 18                     | 5                  | 348 s | $3.54              |
| Claude, told to search every entry, run 3 | 17                     | 4                  | 301 s | $3.24              |
| RefRunner                                 | 20                     | 6                  | ~49 s | —                  |

- **Plain chat** spotted the invented references but had no way to see a
  retraction from this year. It said so: "I am not aware of a retraction for
  any of these references."
- **With web search**, Claude was very good. It looked some entries up and
  took the rest "from my own knowledge", and its misses (#58, a DOI with two
  digits swapped; #65, a wrong title) were in entries it had not looked up.
  Each run missed something different.
- **Told to look up every entry** and return a corrected APA list, it was
  slower, used two to three times as much, and did worse on retractions: in
  runs 2 and 3 it marked retracted papers "Real, accurate. Confirmed." and
  kept them, unmarked, in its corrected list. It also flagged 9–11 accurate
  references, mostly to prefer the issue year to the online-first year,
  which is a fair note rather than an error.
- **RefRunner** flagged all 20 and gave one false warning in 65 (#40, where
  Crossref's own record misspells an author's name).

In fairness to Claude: with search it found a page range that is wrong in
the publisher's own Crossref record (#30), which RefRunner takes as correct,
and it named the real paper behind one invented citation.

## The 16-reference test

An earlier, smaller list: 8 accurate (2 published August 2026), 2 retracted,
3 invented, 3 with an error.

| Setup                          | Problems found (of 8) | Retractions (of 2) |
| ------------------------------ | --------------------- | ------------------ |
| Claude, plain chat, 3 runs     | 5, 6, 5               | 0, 0, 0            |
| Claude with web search, 2 runs | 8, 8                  | 2, 2               |
| RefRunner                      | 8                     | 2                  |

On this list Claude with search did better than RefRunner: RefRunner
reported the wrong-title (#14) and wrong-authors (#15) references as "not
found" rather than naming what was wrong, and gave a false warning on #8 (Crossref misspells
"Ocumpaugh" as "Ccumpaugh"). Claude with search named all three correctly.

## Files

| Path                                                             | What it is                                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `data/references-85.txt`, `data/references-16.txt`               | The lists, one APA reference per line, as given to both tools                                                                          |
| `data/answer-key-85.json`, `data/answer-key-16.json`             | What each reference is (`real`, `retracted`, `fabricated`, `corrupted`…) and what is wrong with it                                     |
| `data/cited-dois.txt`, `data/pool.json`                          | DOIs cited in 2025 IJAIED reference lists (from Crossref), and the records the accurate references were drawn from                     |
| `results/85/claude-*.md`, `results/16/claude-*.md`               | Claude's answers, verbatim. The first line records time, turns and the CLI's API-price estimate (`mode=strict` there is `every` below) |
| `results/*/refrunner.jsonl`                                      | RefRunner's result for each reference, from its real lookup pipeline                                                                   |
| `scripts/ask-claude.mjs`                                         | Gives a list to Claude through the `claude` CLI                                                                                        |
| `scripts/grade.mjs`, `scripts/grade-refrunner.mjs`               | Grade an answer against an answer key                                                                                                  |
| `scripts/pool.mjs`, `scripts/build-list.mjs`, `scripts/meta.mjs` | How the 85-reference list was built from Crossref                                                                                      |

## Checking our grading

Node 20 or later, no dependencies:

```sh
node scripts/grade.mjs data/answer-key-85.json results/85/claude-search-1.md --list
node scripts/grade-refrunner.mjs data/answer-key-85.json results/85/refrunner.jsonl --list
```

`--list` prints each reference, its true kind, and how the answer was read.
For Claude, a problem counts as found when the answer calls the reference
fabricated, retracted, or erroneous; a retraction counts only when the
answer says "retracted". References an answer never names are counted as
judged accurate (the answers say "the rest check out"). For RefRunner, a
reference is flagged when the card would not show it as a clean match: a
warning or not-found outcome, a named correction (retraction, pages,
journal, DOI), or a title match below 75%, which holds the card for review.

## Running it again

Claude: install the [`claude` CLI](https://docs.claude.com/en/docs/claude-code)
and log in, then:

```sh
node scripts/ask-claude.mjs search data/references-85.txt my-run.md   # chat | search | every
node scripts/grade.mjs data/answer-key-85.json my-run.md
```

The script runs Claude from an empty temporary folder with a neutral system
prompt ("You are Claude, a helpful AI assistant made by Anthropic.") and no
connectors, and removes `ANTHROPIC_API_KEY`, so it uses your login. Our runs
went through a flat-rate subscription; the dollar figures are the CLI's own
estimate of the same use at API prices, not what anyone paid.

RefRunner: paste `data/references-85.txt` into
[refrunner.com](https://www.refrunner.com). Every card shows what was found,
what was changed, and why. 85 references is more than the free daily
allowance of 50.

Retractions change over time. A paper retracted after October 24, 2026 is
not in the answer key, and a model trained after that date will know about
these six.

## Caveats

- We make RefRunner, and we wrote this test. Everything is here so that you
  do not have to take our word for it.
- The answer key comes from Crossref, which is also RefRunner's main source.
  Where Crossref is wrong (#30's pages), RefRunner agrees with it.
- One model (Claude Opus 5.5), one month (October 2026), three runs per
  setup.
