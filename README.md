# Ecclesia Atlas

**An interactive, animated atlas of Christian history, doctrine and division, from AD 30 to today.**

Ecclesia Atlas traces 2,000 years of councils, schisms, people, writings, doctrines and spiritual
experiences. It presents every doctrine as something that *developed*: the question that prompted
it, the Scriptures and early voices it drew on, the rival answers, the decisions that settled it,
and their consequences. The tone is that of a fair-minded historian. The atlas never declares a
tradition "correct".

## Features

* **River of Time.** A scroll-driven hero in which one stream branches into the world's traditions.
* **Master Timeline.** Zoom from centuries to single years, with lanes for events, people,
  writings and doctrines. Filter by category, tradition family or region.
* **Family Tree.** An animated branching river of 48 traditions. Each split links to the event
  that caused it.
* **Doctrine skeletons.** React Flow diagrams with automatic layout, a "Play the development"
  animation driven by a year scrubber, node panels with quotes, and a compare-two-positions table.
* **Debate Arena.** A steelman toggle and two rounds, the case and the rebuttals.
* **Compare tool.** A tray holding 2–4 traditions or positions, compared side by side. There is
  also a featured **Legal vs Union gospel** comparison.
* **World Map.** An animated spread of Christianity, with mission routes, councils, revivals and
  experiences.
* **Experiences.** Mystical, ecstatic and supernatural accounts, each assessed from several
  perspectives.
* **Ask the Atlas.** An AI guide (Claude) that answers questions by searching and reading the atlas's own
  entries through tools, then links every entry it used. It works in the app (`/ask`) and from the command line
  (`npm run ask`). Without an API key, the app falls back to a "librarian mode" that lists the best-matching entries.
* **Also:** people with influence graphs, a library, a quote wall, eras with "Life in the
  Church" panels, study paths with quizzes, ⌘K search, and bookmarks and notes saved in the
  browser.

## Appearance

* **Seven colour schemes**, each with light and dark modes: Parchment & Ink, Byzantine, Lapis,
  Iona, Rose Window, Desert Fathers and Monastic. Open them with the palette button. Switching
  plays a circular reveal animation.
* **Avenir Next** is the house typeface. It is used wherever it is installed, for example on
  macOS and iOS. It is a licensed font and cannot be bundled, so other systems fall back to
  Nunito Sans. If you hold a webfont licence, add `@font-face` rules for "Avenir Next" that point
  at files in `public/fonts/`.
* **Motion** can be set to full, reduced or system. The default follows `prefers-reduced-motion`.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # validates content, type-checks, builds to dist/
npm run coverage   # content counts per era / doctrine / tradition / region
npm run qa         # content integrity report
npm run build:single  # one self-contained offline HTML file → dist-single/index.html
npm run ask -- "Why did the Church of the East separate?"   # ask the agent from the terminal
```

## Ask the Atlas (AI agent)

The agent uses Claude through the official Anthropic SDK's tool runner, with five read-only tools over the atlas:
`search_atlas`, `get_entry`, `list_doctrine_positions`, `tradition_lineage` and `events_between`
([`src/agent/tools.ts`](src/agent/tools.ts)). The same tools power both front ends:

* **In the app:** open *Ask the Atlas*, click *Settings* and paste an Anthropic API key. The key is sent
  only from your browser directly to Anthropic, and is stored on your device only if you tick *Remember*.
  Because the key lives in the browser, use one with a spending limit. Pick Opus 5.5 (default),
  Sonnet 5.5 or Haiku 5.5.
* **In the terminal:** `export ANTHROPIC_API_KEY=…` then `npm run ask` for a chat, or
  `npm run ask -- "your question"` for one answer. Add `--model claude-sonnet-5-5` to change model.

## Offline single-file version

`npm run build:single` writes `dist-single/index.html`, about 3.8 MB, with every page, all content, the fonts
and the world map inlined. Double-click it to open it in a browser with no server or internet connection
(only *Ask the Atlas* with a key needs the internet).

**Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, Framer Motion, React Flow with dagre,
D3 (zoom and geo), Fuse.js, Zustand, React Router and Zod.

To add content, see [CONTRIBUTING.md](CONTRIBUTING.md) and [content/README.md](content/README.md).
