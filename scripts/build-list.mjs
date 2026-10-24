// Build data/references-85.txt (APA, alphabetical) + data/answer-key-85.json
// from data/pool.json, the retracted and post-cutoff DOIs below, hand-made
// corruptions, and fabrications.
import { readFileSync, writeFileSync } from "fs";
const dir = new URL(".", import.meta.url).pathname;
const pool = JSON.parse(readFileSync(dir + "../data/pool.json", "utf8"));
const strip = (s) =>
  (s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function rec(doi) {
  for (let t = 0; t < 5; t++) {
    const r = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    );
    if (r.status === 429) {
      await new Promise((ok) => setTimeout(ok, 2000 * (t + 1)));
      continue;
    }
    const w = (await r.json()).message;
    return {
      doi: w.DOI,
      authors: w.author
        .filter((a) => a.family)
        .map((a) => [a.family, a.given || ""]),
      year: (w.published?.["date-parts"] || w.issued["date-parts"])[0][0],
      title: strip(w.title[0]).replace(/^RETRACTED( ARTICLE)?:\s*/i, ""),
      subtitle: strip(w.subtitle?.[0]),
      journal: strip(w["container-title"][0]).replace("&amp;", "&"),
      volume: w.volume,
      issue: w.issue || "",
      loc: w.page || w["article-number"],
      isArticleNo: !w.page,
    };
  }
}

const initials = (g) =>
  g
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((p) =>
      p
        .split("-")
        .map((q) => q[0] + ".")
        .join("-"),
    )
    .join(" ");
function apaAuthors(list) {
  const a = list.map(([f, g]) => (g ? `${f}, ${initials(g)}` : f));
  if (a.length === 1) return a[0];
  if (a.length <= 20) return a.slice(0, -1).join(", ") + ", & " + a.at(-1);
  return a.slice(0, 19).join(", ") + ", … " + a.at(-1);
}
function apa(w, { doi = true } = {}) {
  const title = w.subtitle ? `${w.title}: ${w.subtitle}` : w.title;
  const vol = `${w.volume}${w.issue ? `(${w.issue})` : ""}`;
  const loc = w.loc
    ? `, ${w.isArticleNo ? "Article " : ""}${String(w.loc).replace("-", "–")}`
    : "";
  const end = /[.?!]$/.test(title) ? "" : ".";
  const s = `${apaAuthors(w.authors)} (${w.year}). ${title}${end} ${w.journal}, ${vol}${loc}.${doi && w.doi ? ` https://doi.org/${w.doi}` : ""}`;
  return s.replace(/&amp;/g, "&").replace(/&#39;/g, "'");
}

const items = [];
// 62 accurate; every third without its DOI, as authors often cite.
pool.slice(0, 62).forEach((w, i) =>
  items.push({
    text: apa(w, { doi: i % 3 !== 2 }),
    kind: "real",
    note: `Accurate (${w.doi}).`,
  }),
);

// Post-cutoff accurate (published Jul–Aug 2026, after Claude's training data).
for (const d of [
  "10.18608/jla.2026.9235",
  "10.18608/jla.2026.9175",
  "10.18608/jla.2026.9001",
]) {
  const w = await rec(d);
  // Crossref has "Ccumpaugh" and "S. Baker, Ryan"; cite them as the authors spell their names.
  w.authors = w.authors.map(([f, g]) =>
    f === "Ccumpaugh"
      ? ["Ocumpaugh", g]
      : f === "S. Baker"
        ? ["Baker", "Ryan S."]
        : [f, g],
  );
  items.push({
    text: apa(w),
    kind: "real",
    note: `Accurate; published Jul–Aug 2026 (${d}).`,
  });
}

// Retracted.
const retracted = {
  "10.3389/fpsyg.2021.766660": "Jul 2026",
  "10.1007/s10639-022-11530-6": "Mar 2026",
  "10.1177/00178969241313442": "Aug 2026",
  "10.1016/j.nepr.2025.104262": "Jun 2026",
  "10.1007/s10639-023-11729-1": "Oct 17 2026",
  "10.1057/s41599-025-04787-y": "Apr 2026",
};
for (const [d, when] of Object.entries(retracted)) {
  const w = await rec(d);
  items.push({
    text: apa(w),
    kind: "retracted",
    note: `Real, retracted ${when} (${d}).`,
  });
}

// Corruptions of real records (pool 62–69).
const P = pool;
const c = (i, patch, note, opts) => {
  const w = { ...P[i], ...patch };
  items.push({
    text: apa(w, opts),
    kind: "corrupted",
    note: `${note} Real record: ${P[i].doi}.`,
  });
};
c(
  62,
  {
    title: "The impact of AI and robotics on students' learning outcomes",
    subtitle: "A systematic review",
  },
  `Wrong title; real title "${P[62].title}".`,
  { doi: false },
);
c(
  63,
  {
    authors: [
      ["Scherer", "Ronny"],
      ["Siddiq", "Fazilat"],
      ["Tondeur", "Jo"],
    ],
  },
  "Wrong authors; real authors Antonietti, Cattaneo & Amenduni.",
  { doi: false },
);
c(64, { year: 2015 }, `Wrong year; real year ${P[64].year}.`);
c(
  65,
  { journal: "Journal of Educational Psychology" },
  `Wrong journal; real journal ${P[65].journal}.`,
  { doi: false },
);
c(66, { loc: "1107-1118" }, `Wrong pages; real pages ${P[66].loc}.`, {
  doi: false,
});
c(
  67,
  { doi: "10.1080/08957347.2014.1002902" },
  "DOI digits swapped (…920 → …902); the cited DOI does not exist.",
);
c(
  68,
  {
    title:
      "Early prediction of student dropout using explainable machine learning",
  },
  `Wrong title; real title "${P[68].title}".`,
  { doi: false },
);
c(69, { year: 1979 }, `Wrong year; real year ${P[69].year}.`, { doi: false });

// Fabricated.
const fab = [
  [
    "Okonkwo, A. N., & Reiter, J. (2021). Explainable dropout prediction in blended courses using gradient-boosted trees. Computers & Education, 172, Article 104268.",
    "Invented.",
  ],
  [
    "Thornbury, K., Malik, S., & Wen, Y. (2023). Rubric-aligned large language model feedback on argumentative essays: A randomized field trial. Journal of Educational Psychology, 115(6), 912–930.",
    "Invented.",
  ],
  [
    "Delacroix, M. (2019). Measuring collaborative knowledge construction in online discussions. Educational Technology Research and Development, 67(4), 1021–1044. https://doi.org/10.1007/s11423-019-09662-x",
    "Invented; the DOI does not exist.",
  ],
  [
    "Nakamura, H., & Feldt, R. (2022). Automated short-answer scoring with transformer ensembles. International Journal of Artificial Intelligence in Education, 32(3), 611–640. https://doi.org/10.1007/s40593-021-00271-1",
    "Invented; the DOI belongs to a different paper (Marras et al., Equality of learning opportunity…, IJAIED 32(3), 636–684).",
  ],
  [
    "Brennan, L. (2020). Data-informed teaching: A practitioner's guide to learning analytics. Teachers College Press.",
    "Invented book.",
  ],
  [
    "Ivanova, P., Schmidt, T., & Alvarez, R. (2024). Fairness audits of predictive models in higher education admissions. British Journal of Educational Technology, 55(2), 488–507.",
    "Invented.",
  ],
];
for (const [text, note] of fab) items.push({ text, kind: "fabricated", note });

items.sort((a, b) => a.text.localeCompare(b.text, "en"));
writeFileSync(
  dir + "../data/references-85.txt",
  items.map((x) => x.text).join("\n") + "\n",
);
writeFileSync(
  dir + "../data/answer-key-85.json",
  JSON.stringify(
    items.map((x, i) => ({
      n: i + 1,
      kind: x.kind,
      note: x.note,
      text: x.text,
    })),
    null,
    1,
  ),
);
console.log(
  items.length,
  items.filter((x) => x.kind !== "real").length,
  "problems",
);
