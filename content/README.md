# Ecclesia Atlas content

All content lives here as JSON **packs**. A pack is an object whose keys are entity
collections (`sources`, `eras`, `cultures`, `events`, `people`, `works`, `quotes`,
`doctrines`, `positions`, `traditions`, `controversies`, `experiences`,
`comparisons`, `paths`, `presences`), each an array. The exact shape of every
entity is defined (and documented) by the Zod schemas in
[`src/data/schema.ts`](../src/data/schema.ts).

```
content/
  core/         eras, traditions, reference sources
  history/      timeline events, "Life in the Church" culture panels, map presences
  people/       shared people and their works
  doctrines/    one pack per doctrine: doctrine + flowchart + positions + controversies
                (plus the people, works and quotes that doctrine needs)
  experiences/  §6 mystical, ecstatic and supernatural accounts
  paths/        guided study paths and quizzes
```

`npm run validate` merges every pack and fails on any schema error or broken
reference. It runs automatically before `npm run build`. Use
`npm run validate -- --only content/doctrines/trinity.json` to see only the
errors originating in one file.

## Merging

The same person, event, work, quote, tradition or source may be declared in more
than one pack: arrays are unioned and the first non-empty scalar wins (a
conflict is reported as a warning). Doctrines, positions, controversies,
comparisons, study paths and eras must be declared exactly once.

## Id conventions

* kebab-case, ASCII, stable forever (URLs depend on them).
* People: common English name, e.g. `augustine-of-hippo`, `john-calvin`,
  `gregory-of-nyssa`, `thomas-f-torrance`.
* Events: short descriptive slug with year when helpful: `council-of-nicaea-325`.
* Quotes: `<person>-<short-slug>`, e.g. `athanasius-became-man`.
* Positions: `<doctrine>-<view>` is not required, but must be unique,
  e.g. `penal-substitution`, `amillennialism`.

## Integrity rules (please read before adding content)

1. **Sources.** Every event, person, position, experience and tradition carries
   at least one `sources` id. Add new reference works to a `sources` array.
2. **Confidence.** Use `confidence` to separate `established` fact, scholarly
   `debated` claims and `traditional` (legendary) material. Experiences use
   `well-documented` / `contested` / `hagiographical`.
3. **Fairness.** Write each position in its adherents' own terms first
   (`coreClaims`, `strongestArguments`), then critiques (`strongestObjections`)
   and replies (`responses`). Never declare a tradition "correct".
4. **Quotes.** Never invent quotes. Ancient and pre-1929 texts may be quoted
   from public-domain translations with an exact citation. Modern copyrighted
   authors: at most one short (< 15 words) quote per work, otherwise set
   `"kind": "paraphrase"` and paraphrase. If unsure of the exact wording, use a
   paraphrase.
5. **Neutral names.** Where traditions disagree on a name, give both
   (e.g. "Miaphysite (often called Monophysite by opponents)").
6. **Adherent numbers** need a year and a source.
7. **Global coverage.** Each era should include Eastern Orthodox, Oriental
   Orthodox, Church of the East, African, Asian and Latin American material,
   not only Western developments.

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for step-by-step recipes.
