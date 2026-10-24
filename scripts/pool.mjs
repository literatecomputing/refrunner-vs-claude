// Fetch Crossref records for cited DOIs (seeded shuffle) until N usable journal articles; write data/pool.json.
import { readFileSync, writeFileSync } from "fs";
const dir = new URL(".", import.meta.url).pathname;
const N = Number(process.argv[2] || 80);
const dois = readFileSync(dir + "../data/cited-dois.txt", "utf8")
  .trim()
  .split("\n");
let seed = 42;
const rnd = () =>
  (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let i = dois.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [dois[i], dois[j]] = [dois[j], dois[i]];
}
const strip = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
const pool = [];
const why = {};
for (const doi of dois) {
  if (pool.length >= N) break;
  let r;
  for (let t = 0; t < 5; t++) {
    r = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    );
    if (r.status !== 429) break;
    await new Promise((ok) => setTimeout(ok, 2000 * (t + 1)));
  }
  await new Promise((ok) => setTimeout(ok, 250));
  if (!r.ok) {
    why[r.status] = (why[r.status] || 0) + 1;
    continue;
  }
  const w = (await r.json()).message;
  if (w.type !== "journal-article") {
    why[w.type] = (why[w.type] || 0) + 1;
    continue;
  }
  if ((w["updated-by"] || []).length) continue;
  const au = (w.author || []).filter((a) => a.family && a.given);
  const year = (w.published?.["date-parts"] ||
    w.issued?.["date-parts"])?.[0]?.[0];
  const loc = w.page || w["article-number"];
  if (!loc) why.noloc = (why.noloc || 0) + 1;
  if (
    !au.length ||
    au.length > 20 ||
    !w.title?.[0] ||
    !w["container-title"]?.[0] ||
    !w.volume ||
    !loc ||
    !year
  )
    continue;
  pool.push({
    doi: w.DOI,
    authors: au.map((a) => [a.family, a.given]),
    year,
    title: strip(w.title[0]),
    subtitle: strip(w.subtitle?.[0]),
    journal: strip(w["container-title"][0]),
    volume: w.volume,
    issue: w.issue || "",
    loc,
    isArticleNo: !w.page,
  });
}
writeFileSync(dir + "../data/pool.json", JSON.stringify(pool, null, 1));
console.log(pool.length, JSON.stringify(why));
