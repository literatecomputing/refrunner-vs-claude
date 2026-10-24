// Grade RefRunner's batch output (one JSON line per reference) against an answer key.
// Usage: node scripts/grade-refrunner.mjs data/answer-key-85.json results/85/refrunner.jsonl [--list]
//
// A reference counts as flagged when the card would not show it as a clean match:
//   outcome other than "found" (found:warn, notFound, unregistered, wrongDoi, mismatch)
//   or a named correction: retraction, pages, journal, doiCorrected
//   or titleScore below 0.75 (the card is held for review: "N% match — review differences")
// A year change alone is not counted: on accurate references it is the
// online-first vs issue year, which the card shows as a neutral note.
import { readFileSync } from "fs";
const [keyFile, runFile, flag] = process.argv.slice(2);
const key = JSON.parse(readFileSync(keyFile, "utf8"));
const rows = Object.fromEntries(
  readFileSync(runFile, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .map((r) => [r.n, r]),
);
const flags = (r) =>
  [
    r.outcome !== "found" && r.outcome,
    r.retraction && "retraction",
    r.pages && `pages ${r.pages}`,
    r.journal && `journal ${r.journal}`,
    r.doiCorrected && `doi ${r.doiCorrected}`,
    r.titleScore !== undefined &&
      r.titleScore < 0.75 &&
      `title ${r.titleScore}`,
  ].filter(Boolean);
const t = {
  problems: 0,
  flagged: 0,
  retracted: 0,
  retractedCaught: 0,
  real: 0,
  realClean: 0,
  realFlagged: [],
  missed: [],
};
for (const k of key) {
  const r = rows[k.n];
  const f = r ? flags(r) : ["missing"];
  if (flag === "--list")
    console.log(k.n, k.kind.padEnd(13), f.join(" | ") || "clean");
  if (k.kind === "real") {
    t.real++;
    if (f.length) t.realFlagged.push(`${k.n}:${f.join(",")}`);
    else t.realClean++;
    continue;
  }
  t.problems++;
  if (k.kind === "retracted") {
    t.retracted++;
    if (r?.retraction) t.retractedCaught++;
  }
  const caught = k.kind === "retracted" ? !!r?.retraction : f.length > 0;
  if (caught) t.flagged++;
  else t.missed.push(k.n);
}
console.log(JSON.stringify(t));
