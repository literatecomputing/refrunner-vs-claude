// Ask Claude (via the claude CLI, from an empty temp dir) to check a reference
// list as a journal editor would.
// Usage: node scripts/ask-claude.mjs <chat|search|every> <references.txt> <out.md>
//   chat   = no tools
//   search = WebSearch + WebFetch
//   every  = search, told to look up EVERY entry and return a corrected APA list
// Runs on whatever the claude CLI is logged in as; ANTHROPIC_API_KEY is removed
// so a subscription login is used rather than an API key.
import { spawnSync } from "child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const [mode, refsFile, out] = process.argv.slice(2);
if (!["chat", "search", "every"].includes(mode) || !refsFile || !out) {
  console.error(
    "Usage: node scripts/ask-claude.mjs <chat|search|every> <references.txt> <out.md>",
  );
  process.exit(1);
}
const search = mode === "search" || mode === "every";
const refs = readFileSync(refsFile, "utf8")
  .trim()
  .split("\n")
  .map((r, i) => `${i + 1}. ${r}`)
  .join("\n");
const ask =
  mode === "every"
    ? `I'm an editor at a learning analytics journal. Here is the reference list from a submitted manuscript. Use web search to look up EVERY reference: do not rely on memory for any entry, however well known. For each one, tell me whether it is real and accurate, real but with errors (say which), retracted, or appears to be fabricated, with a one-line reason. Answer in a markdown table with columns | # | Verdict | Reason |. Then give me the full corrected reference list in APA 7th edition, leaving out fabricated entries.`
    : `I'm an editor at a learning analytics journal. Here is the reference list from a submitted manuscript. Please check every reference. For each one, tell me whether it is real and accurate, real but with errors (say which), retracted, or appears to be fabricated, with a one-line reason.`;
const prompt = `${ask}

${refs}`;
const args = [
  "-p",
  "--strict-mcp-config",
  "--model",
  "claude-opus-5-5",
  "--output-format",
  "json",
  "--system-prompt",
  "You are Claude, a helpful AI assistant made by Anthropic.",
  "--tools",
  search ? "WebSearch,WebFetch" : "",
  ...(search ? ["--allowedTools", "WebSearch,WebFetch"] : []),
];
const t = Date.now();
const env = { ...process.env };
delete env.ANTHROPIC_API_KEY;
const r = spawnSync("claude", args, {
  cwd: mkdtempSync(join(tmpdir(), "ask-claude-")),
  env,
  input: prompt,
  encoding: "utf8",
  maxBuffer: 1 << 26,
});
const secs = Math.round((Date.now() - t) / 1000);
let j;
try {
  j = JSON.parse(r.stdout);
} catch {
  console.error(r.stdout, r.stderr);
  process.exit(1);
}
writeFileSync(
  out,
  `<!-- mode=${mode} secs=${secs} turns=${j.num_turns} cost=${j.total_cost_usd} -->\n${j.result}\n`,
);
console.log(mode, secs, j.num_turns, j.total_cost_usd, j.is_error);
