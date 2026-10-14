/**
 * Ecclesia Atlas content schemas.
 *
 * Every JSON file under /content is a "pack": an object whose keys are the
 * plural entity names below, each holding an array of entities. Packs are
 * merged at load time (see build.ts). Ids are stable kebab-case strings.
 */
import { z } from 'zod';

export const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ids must be kebab-case');
const Ids = z.array(Id).default([]);
const Strs = z.array(z.string()).default([]);

/** Negative years are BC. */
export const Year = z.number().int();

export const Confidence = z.enum(['established', 'debated', 'traditional']);
export type Confidence = z.infer<typeof Confidence>;

export const Region = z.enum([
  'levant',
  'asia-minor',
  'greece-balkans',
  'italy',
  'western-europe',
  'northern-europe',
  'eastern-europe',
  'russia',
  'egypt',
  'north-africa',
  'ethiopia-nubia',
  'sub-saharan-africa',
  'armenia-caucasus',
  'mesopotamia-persia',
  'arabia',
  'central-asia',
  'india',
  'east-asia',
  'southeast-asia',
  'latin-america',
  'north-america',
  'oceania',
  'global',
]);
export type Region = z.infer<typeof Region>;

export const Place = z.object({
  name: z.string(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Place = z.infer<typeof Place>;

export const Source = z.object({
  id: Id,
  title: z.string(),
  author: z.string().optional(),
  year: z.union([z.number(), z.string()]).optional(),
  kind: z.enum(['primary', 'secondary', 'reference', 'data']),
  url: z.string().url().optional(),
  note: z.string().optional(),
});

export const TraditionFamily = z.enum([
  'early',
  'catholic',
  'orthodox',
  'oriental',
  'east-syriac',
  'lutheran',
  'reformed',
  'anglican',
  'anabaptist',
  'baptist',
  'methodist',
  'pentecostal',
  'restorationist',
  'evangelical',
  'independent',
  'nontrinitarian',
  'heterodox-ancient',
  'united',
]);
export type TraditionFamily = z.infer<typeof TraditionFamily>;

export const Era = z.object({
  id: Id,
  order: z.number().int(),
  name: z.string(),
  short: z.string(),
  startYear: Year,
  endYear: Year,
  summary: z.string(),
  keyThemes: Strs,
  colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  globalNotes: z
    .array(z.object({ region: Region, text: z.string() }))
    .default([])
    .describe('Non-Western developments in this era, one per region'),
});

export const CultureTopic = z.enum([
  'worship',
  'music',
  'architecture',
  'art',
  'monasticism',
  'calendar',
  'women',
  'education',
  'missions',
  'persecution',
  'judaism',
  'islam',
  'state',
]);
export const Culture = z.object({
  id: Id,
  eraId: Id,
  panels: z.array(
    z.object({
      topic: CultureTopic,
      title: z.string(),
      text: z.string(),
      regions: z.array(Region).default([]),
    }),
  ),
  architectureDiagram: z
    .enum(['house-church', 'catacomb', 'basilica', 'cross-in-square', 'romanesque', 'gothic', 'meeting-house', 'auditorium', 'megachurch', 'rock-hewn'])
    .optional(),
  sources: Ids,
});

export const EventCategory = z.enum([
  'council',
  'schism',
  'persecution',
  'mission',
  'revival',
  'reform',
  'political',
  'liturgical',
  'intellectual',
  'experiential',
]);

export const Event = z.object({
  id: Id,
  title: z.string(),
  year: Year,
  endYear: Year.optional(),
  circa: z.boolean().default(false),
  place: Place.optional(),
  category: EventCategory,
  regions: z.array(Region).default([]),
  summary: z.string(),
  longText: z.string().optional(),
  causes: Strs,
  consequences: Strs,
  peopleIds: Ids,
  doctrineIds: Ids,
  traditionIds: Ids,
  sources: Ids,
  confidence: Confidence.default('established'),
});

export const Person = z.object({
  id: Id,
  name: z.string(),
  born: Year.optional(),
  died: Year.optional(),
  circa: z.boolean().default(false),
  roles: Strs,
  traditionIds: Ids,
  regions: z.array(Region).default([]),
  summary: z.string(),
  keyIdeas: Strs,
  influencedBy: Ids,
  place: Place.optional(),
  portrait: z
    .object({ url: z.string().url(), licence: z.string(), credit: z.string() })
    .optional(),
  sources: Ids,
  confidence: Confidence.default('established'),
});

export const Genre = z.enum([
  'letter',
  'apology',
  'creed',
  'confession',
  'treatise',
  'sermon',
  'hymn',
  'catechism',
  'canon',
  'testimony',
  'history',
  'commentary',
  'devotional',
  'rule',
  'liturgy',
  'scripture',
]);

export const Work = z.object({
  id: Id,
  title: z.string(),
  authorId: Id.optional(),
  author: z.string().optional(),
  year: Year,
  circa: z.boolean().default(false),
  language: z.string(),
  genre: Genre,
  summary: z.string(),
  significance: z.string(),
  fullTextUrl: z.string().url().optional(),
  doctrineIds: Ids,
  sources: Ids,
});

export const Quote = z.object({
  id: Id,
  text: z.string(),
  kind: z.enum(['quotation', 'paraphrase']),
  translation: z.string().optional(),
  personId: Id,
  workId: Id.optional(),
  citation: z.string(),
  year: Year.optional(),
  topics: Strs,
  doctrineIds: Ids,
});

export const FlowNodeKind = z.enum([
  'question',
  'scripture',
  'voice',
  'position',
  'argument',
  'decision',
  'consequence',
  'modern',
]);
export type FlowNodeKind = z.infer<typeof FlowNodeKind>;

export const EntityType = z.enum([
  'era',
  'event',
  'person',
  'work',
  'quote',
  'doctrine',
  'position',
  'tradition',
  'controversy',
  'experience',
  'comparison',
  'path',
]);
export type EntityType = z.infer<typeof EntityType>;

export const Ref = z.object({ type: EntityType, id: Id });
export type Ref = z.infer<typeof Ref>;

export const FlowNode = z.object({
  id: Id,
  kind: FlowNodeKind,
  label: z.string(),
  year: Year.optional(),
  text: z.string().optional(),
  ref: Ref.optional(),
  quoteIds: Ids,
});
export const FlowEdge = z.object({
  from: Id,
  to: Id,
  kind: z.enum(['supports', 'objects', 'responds', 'develops', 'rejects', 'leads-to', 'decides']),
});

export const Doctrine = z.object({
  id: Id,
  name: z.string(),
  icon: z.enum(['trinity', 'cross', 'book', 'dove', 'flame', 'crown', 'chalice', 'water', 'scroll', 'hourglass', 'star', 'scales', 'globe', 'sun', 'people', 'lamp', 'quill', 'compass']),
  order: z.number().int().default(100),
  question: z.string(),
  summary: z.string(),
  longText: z.string().optional(),
  flow: z.object({ nodes: z.array(FlowNode), edges: z.array(FlowEdge) }),
  sources: Ids,
});

export const Position = z.object({
  id: Id,
  doctrineId: Id,
  name: z.string(),
  altNames: Strs,
  oneLine: z.string(),
  coreClaims: Strs,
  keyTexts: Strs,
  origin: z.string(),
  originYear: Year.optional(),
  proponentIds: Ids,
  proponentsOther: Strs,
  traditionIds: Ids,
  strongestArguments: Strs,
  strongestObjections: Strs,
  responses: Strs,
  consequences: Strs,
  relatedPositionIds: Ids,
  standing: z.enum(['majority', 'significant', 'minority', 'historic', 'rejected-by-councils']).default('significant'),
  sources: Ids,
  confidence: Confidence.default('established'),
});

export const Tradition = z.object({
  id: Id,
  name: z.string(),
  family: TraditionFamily,
  parentIds: Ids,
  splitEventId: Id.optional(),
  foundedYear: Year,
  endYear: Year.optional(),
  regions: z.array(Region).default([]),
  adherents: z
    .object({ estimate: z.number(), year: z.number().int(), source: z.string() })
    .optional(),
  summary: z.string(),
  distinctives: Strs,
  profile: z.object({
    authority: z.string(),
    salvation: z.string(),
    sacraments: z.string(),
    eschatology: z.string(),
    governance: z.string(),
    worship: z.string(),
    canon: z.string(),
  }),
  status: z.string(),
  sources: Ids,
});

export const Controversy = z.object({
  id: Id,
  question: z.string(),
  title: z.string(),
  summary: z.string(),
  doctrineIds: Ids,
  sides: z
    .array(
      z.object({
        name: z.string(),
        positionId: Id.optional(),
        steelman: z.string().describe("This side's best case, in its own voice"),
        arguments: Strs,
        counterArguments: Strs,
        keyTexts: Strs,
        quoteIds: Ids,
      }),
    )
    .min(2),
  timeline: z.array(z.object({ year: Year, text: z.string(), eventId: Id.optional() })).default([]),
  resolution: z.object({
    kind: z.enum(['council', 'schism', 'open', 'mixed', 'faded', 'dialogue']),
    text: z.string(),
  }),
  consequences: Strs,
  sources: Ids,
});

export const Phenomenon = z.enum([
  'tongues',
  'healing',
  'prophecy',
  'vision',
  'ecstasy',
  'stigmata',
  'laughter',
  'slain-in-spirit',
  'trembling',
  'conversion',
  'apparition',
  'miracle',
  'mystical-union',
  'light',
  'revival',
  'deliverance',
]);
export const Experience = z.object({
  id: Id,
  title: z.string(),
  year: Year,
  endYear: Year.optional(),
  circa: z.boolean().default(false),
  place: Place,
  regions: z.array(Region).default([]),
  personIds: Ids,
  traditionIds: Ids,
  phenomena: z.array(Phenomenon).min(1),
  account: z.string(),
  primarySource: z.object({ title: z.string(), citation: z.string(), url: z.string().url().optional() }),
  contemporaryInterpretation: z.string(),
  assessments: z.array(z.object({ perspective: z.string(), text: z.string() })).min(2),
  debates: Strs,
  story: z.string().optional().describe('The full narrative, several paragraphs separated by blank lines'),
  keyMoments: z.array(z.object({ year: Year.optional(), date: z.string().optional(), text: z.string() })).default([]),
  significance: z.string().optional().describe('Why it matters: its effects on churches, theology and later movements'),
  confidence: z.enum(['well-documented', 'contested', 'hagiographical']),
  sources: Ids,
});

export const Comparison = z.object({
  id: Id,
  title: z.string(),
  summary: z.string(),
  columns: z.array(z.object({ name: z.string(), positionIds: Ids, proponentIds: Ids, colour: z.string().optional() })).min(2),
  rows: z.array(z.object({ topic: z.string(), cells: z.array(z.string()) })),
  overlaps: Strs,
  differences: Strs,
  critiques: z.array(z.array(z.string())).default([]).describe('one array of critiques per column'),
  practical: z.array(z.object({ area: z.string(), cells: z.array(z.string()) })).default([]),
  sources: Ids,
});

export const StudyPath = z.object({
  id: Id,
  title: z.string(),
  summary: z.string(),
  icon: Doctrine.shape.icon,
  steps: z
    .array(z.object({ title: z.string(), text: z.string(), year: Year.optional(), refs: z.array(Ref).default([]) }))
    .min(3),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).min(2),
        answer: z.number().int().min(0),
        explanation: z.string(),
      }),
    )
    .default([]),
});

export const Presence = z.object({
  id: Id,
  label: z.string(),
  year: Year,
  place: Place,
  kind: z.enum(['community', 'mission-route', 'council', 'revival', 'centre']),
  note: z.string(),
  route: z.array(z.tuple([z.number(), z.number()])).optional().describe('[lng, lat] points for mission routes'),
  endYear: Year.optional(),
  sources: Ids,
  confidence: Confidence.default('established'),
});

export const Pack = z
  .object({
    sources: z.array(Source),
    eras: z.array(Era),
    cultures: z.array(Culture),
    events: z.array(Event),
    people: z.array(Person),
    works: z.array(Work),
    quotes: z.array(Quote),
    doctrines: z.array(Doctrine),
    positions: z.array(Position),
    traditions: z.array(Tradition),
    controversies: z.array(Controversy),
    experiences: z.array(Experience),
    comparisons: z.array(Comparison),
    paths: z.array(StudyPath),
    presences: z.array(Presence),
  })
  .partial()
  .strict();

export type Pack = z.infer<typeof Pack>;
export type Source = z.infer<typeof Source>;
export type Era = z.infer<typeof Era>;
export type Culture = z.infer<typeof Culture>;
export type Event = z.infer<typeof Event>;
export type Person = z.infer<typeof Person>;
export type Work = z.infer<typeof Work>;
export type Quote = z.infer<typeof Quote>;
export type Doctrine = z.infer<typeof Doctrine>;
export type FlowNode = z.infer<typeof FlowNode>;
export type FlowEdge = z.infer<typeof FlowEdge>;
export type Position = z.infer<typeof Position>;
export type Tradition = z.infer<typeof Tradition>;
export type Controversy = z.infer<typeof Controversy>;
export type Experience = z.infer<typeof Experience>;
export type Comparison = z.infer<typeof Comparison>;
export type StudyPath = z.infer<typeof StudyPath>;
export type Presence = z.infer<typeof Presence>;
