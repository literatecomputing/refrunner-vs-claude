// Print Crossref metadata for each DOI given: authors, year, title, journal, vol(issue), pages, updated-by.
for (const doi of process.argv.slice(2)) {
  const r = await fetch(
    `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
  );
  if (!r.ok) {
    console.log(doi, "HTTP", r.status);
    continue;
  }
  const w = (await r.json()).message;
  const au = (w.author || []).map((a) => `${a.family}, ${a.given}`).join("; ");
  const y = (w.issued?.["date-parts"]?.[0] || []).join("-");
  console.log(
    `${doi}\n  ${au}\n  ${y} | ${w.title?.[0]}\n  ${w["container-title"]?.[0]} ${w.volume || ""}(${w.issue || ""}) ${w.page || w["article-number"] || ""}\n  updated-by: ${JSON.stringify((w["updated-by"] || []).map((u) => [u.type, u.DOI]))}`,
  );
}
