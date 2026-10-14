# Contributing to Ecclesia Atlas

All content is plain JSON under [`content/`](content/). You don't need to touch any React code
to add a person, event, doctrine or position. Read [`content/README.md`](content/README.md) first
for the integrity rules (sources, confidence, fairness, quotation policy).

The shape of every entity is defined in [`src/data/schema.ts`](src/data/schema.ts). Run
`npm run validate` after every change. It fails on schema errors and on broken references, and
`npm run build` runs it automatically.

## Add a person

Add the person to a pack's `people` array. For a person tied to one doctrine, use that doctrine's
file. Otherwise use `content/people/core-people.json`.

```json
{
  "id": "gregory-of-nyssa",
  "name": "Gregory of Nyssa",
  "born": 335, "died": 395, "circa": true,
  "roles": ["Bishop of Nyssa", "Cappadocian Father"],
  "traditionIds": ["early-church"],
  "regions": ["asia-minor"],
  "summary": "Two or three neutral sentences.",
  "keyIdeas": ["Divine infinity", "Epektasis"],
  "influencedBy": ["basil-of-caesarea", "origen"],
  "place": { "name": "Nyssa, Cappadocia", "lat": 38.9, "lng": 34.6 },
  "sources": ["odcc", "kelly-doctrines"],
  "confidence": "established"
}
```

`influencedBy` builds the influence graph on the person page. A person may appear in more than
one pack. Arrays are merged, so another pack can add more `influencedBy` or `traditionIds`.

## Add an event

Add the event to a file in `content/history/`. The `category` drives the timeline colour and
icon. The `place` drives the world map. The era is worked out from `year`.

```json
{
  "id": "council-of-nicaea-325",
  "title": "First Council of Nicaea",
  "year": 325,
  "place": { "name": "Nicaea (İznik)", "lat": 40.43, "lng": 29.72 },
  "category": "council",
  "regions": ["asia-minor"],
  "summary": "…",
  "longText": "Optional paragraphs, separated by a blank line.",
  "causes": ["…"], "consequences": ["…"],
  "peopleIds": ["athanasius", "arius"], "doctrineIds": ["trinity"], "traditionIds": ["early-church"],
  "sources": ["kelly-creeds"], "confidence": "established"
}
```

## Add a position to an existing doctrine

Add the position to the `positions` array of `content/doctrines/<doctrine>.json`. Write it in
this order, so that it is fair:

1. `oneLine`, `coreClaims` and `strongestArguments`, written as the view's own best defenders
   would put them.
2. `strongestObjections`, the best critiques from other traditions.
3. `responses`, how adherents reply to those critiques.

To show the position on the doctrine's flowchart, add a node:
`{ "id": "n-amil", "kind": "position", "label": "Amillennialism", "year": 400, "ref": { "type": "position", "id": "amillennialism" } }`.
Then connect the node with edges such as `{ "from": "n-augustine", "to": "n-amil", "kind": "develops" }`.

## Add a new doctrine

Create `content/doctrines/<id>.json` with a `doctrines` entry and its `positions`. Its `flow`
should use all eight node kinds: question → scripture → voice → position → argument →
decision → consequence → modern. Give every node except the root question a `year`, so that
"Play the development" can animate it. The layout is automatic (dagre). Keep the graph a DAG
that flows downward.

Then add one or two `controversies` for the Debate Arena. Each side gets a `steelman` written in
its own voice.

## Quotations

* Quote verbatim only from public-domain texts, such as ancient and patristic writings and
  pre-1929 translations, with an exact `citation`.
* For modern copyrighted authors, use at most one quote under 15 words per work. Otherwise set
  `"kind": "paraphrase"`.
* **If you are unsure of the exact wording, paraphrase.** Never invent a quote.

## Checks

| Command | What it does |
| --- | --- |
| `npm run validate` | Checks schemas and cross-references. Fails the build on errors. |
| `npm run validate -- --only content/doctrines/trinity.json` | Shows only the errors from one file. |
| `npm run coverage` | Counts content per era, doctrine, tradition family and region. |
| `npm run qa` | Lists missing sources, orphaned ids, eras without non-Western entries and positions without objections. |
