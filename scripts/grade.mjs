// Grade a Claude answer (markdown table rows "| n | verdict | reason |") against an answer key.
// Usage: node scripts/grade.mjs data/answer-key-85.json results/85/claude-search-1.md [--list]
import { readFileSync } from "fs";
const [truthFile, ansFile, flag] = process.argv.slice(2);
const truth = JSON.parse(readFileSync(truthFile, "utf8"));
const ans = readFileSync(ansFile, "utf8");

// Claude answers in three shapes, all read here:
//   a row per reference          | 12 | Real, error | reason |
//   rows under a verdict heading ## Appears fabricated (6)  then  | 10 | Brennan (2020) | reason |
//   a category with its numbers  | Appears fabricated | 6 | 10, 19, 35 |   or a bare "1, 2, 3, …" line
// The first readable verdict for a reference wins. A reference the answer
// never names is counted as judged accurate ("The rest check out").
const verdicts = {};
const put = (n, v, why = "") => {
  if (!verdicts[n] || bucket(verdicts[n].v) === "?") verdicts[n] = { v, why };
};
const NUMS = /^\s*#?\d{1,3}(?:\s*,\s*#?\d{1,3})+\s*\.?\s*$/;
const nums = (s) => s.match(/\d{1,3}/g).map(Number);
const VERDICT =
  /^(?:real|retract|fabricat|misattribut|conflat|chimer|appears|likely|probabl|accurate|correct|unverif|cannot|can't|not\b|error|minor|wrong|ok\b|confirmed|exists|mixed|invented|does not)/i;
let section = "";
for (const line of ans.split("\n")) {
  const h = line.match(/^#{1,4}\s+(.+)/);
  if (h) {
    section = h[1];
    continue;
  }
  if (NUMS.test(line)) {
    for (const n of nums(line)) put(n, section);
    continue;
  }
  if (!line.startsWith("|")) continue;
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((c) => c.replace(/\*/g, "").trim());
  if (/^#?\d{1,3}$/.test(cells[0] || "")) {
    // The second column is a verdict only when it reads like one; under a
    // verdict heading it is usually the reference ("Okonkwo & Reiter (2021)").
    const v = VERDICT.test(cells[1] || "") ? cells[1] : section;
    put(Number(cells[0].replace("#", "")), v, cells.at(-1));
  } else {
    const list = cells
      .slice(1)
      .reverse()
      .find((c) => NUMS.test(c) || /^\d{1,3}$/.test(c));
    if (list) for (const n of nums(list)) put(n, cells[0]);
  }
}
function bucket(v) {
  const s = v.toLowerCase();
  if (/retract/.test(s)) return "retracted";
  if (
    /fabricat|not exist|no such|invent|chimer|conflat|misattribut|made.up/.test(
      s,
    )
  )
    return "fabricated";
  if (/unverif|can.?t|cannot|unable|unclear|uncertain|check/.test(s))
    return "unverified";
  if (
    /error|wrong|incorrect|mismatch|minor|small|issue|omission|incomplete/.test(
      s,
    )
  )
    return "errors";
  if (/accurate|correct|real|ok|fine|verified/.test(s)) return "real";
  return "?";
}
const tally = {
  problemsFlagged: 0,
  problems: 0,
  retractedCaught: 0,
  retracted: 0,
  realOk: 0,
  real: 0,
  realFlagged: [],
  realUnverified: [],
  missed: [],
  missing: [],
};
for (const t of truth) {
  let a = verdicts[t.n];
  if (!a) {
    tally.missing.push(t.n);
    a = { v: "accurate (not named)", why: "" };
  }
  const b = bucket(a.v);
  if (t.kind === "real") {
    tally.real++;
    if (b === "real") tally.realOk++;
    else if (b === "unverified") tally.realUnverified.push(t.n);
    else tally.realFlagged.push(`${t.n}:${b}`);
  } else {
    tally.problems++;
    if (t.kind === "retracted") {
      tally.retracted++;
      if (b === "retracted") tally.retractedCaught++;
    }
    const caught =
      t.kind === "retracted"
        ? b === "retracted"
        : ["fabricated", "errors", "retracted"].includes(b);
    if (caught) tally.problemsFlagged++;
    else tally.missed.push(`${t.n}(${t.kind}):${b}`);
  }
  if (flag === "--list")
    console.log(
      t.n,
      t.kind.padEnd(10),
      bucket(a.v).padEnd(10),
      "|",
      a.v,
      "|",
      a.why.slice(0, 110),
    );
}
console.log(
  JSON.stringify({
    file: ansFile.split("/").pop(),
    header: ans.split("\n")[0],
    answered: Object.keys(verdicts).length,
    ...tally,
  }),
);
