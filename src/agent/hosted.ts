/**
 * When the atlas is published as a claude.ai Artifact, the page can ask Claude through the viewer's own
 * account (the `sample` capability) instead of an API key. This adapter runs the same atlas tools there.
 */
import type { Atlas } from '../data/db';
import { createAtlasTools, describeEntry, SYSTEM_PROMPT, type ToolEvent } from './tools';
import { getFuse } from '../data/searchIndex';
import type { Turn } from './run';

interface SampleTool { name: string; description: string; inputSchema?: Record<string, unknown>; execute(input: Record<string, unknown>): unknown }
interface SampleFn {
  (input: string | { role: 'user' | 'assistant'; content: string }[], options?: Record<string, unknown>): Promise<{ text: string; truncated: boolean }>;
  limits(): Promise<{ tools?: { maxCount: number } }>;
}
interface ClaudeRuntime { use(name: string): Promise<unknown> }

export interface HostedSampler { sample: SampleFn; canUseTools: boolean }

/** Resolves the viewer's Claude when this page runs inside a claude.ai viewer, else null. */
export async function getHostedSampler(): Promise<HostedSampler | null> {
  const rt = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!rt?.use) return null;
  try {
    const sample = (await rt.use('sample')) as SampleFn | null;
    if (!sample) return null;
    const limits = await sample.limits().catch(() => null);
    return { sample, canUseTools: !!limits?.tools };
  } catch {
    return null;
  }
}

export async function askAtlasHosted(opts: {
  sampler: HostedSampler;
  atlas: Atlas;
  history: Turn[];
  question: string;
  onEvent?: (e: ToolEvent) => void;
  onText?: (text: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  // betaZodTool objects carry the wire fields (name, description, input_schema) plus run().
  type WireTool = { name: string; description?: string; input_schema: Record<string, unknown>; run(input: never): unknown };
  const tools: SampleTool[] = (createAtlasTools(opts.atlas, opts.onEvent) as unknown as WireTool[]).map((t) => ({
    name: t.name,
    description: t.description ?? '',
    inputSchema: t.input_schema,
    execute: async (input) => {
      const out = await t.run(input as never);
      // Keep each tool result under the platform's 32 KB limit.
      return typeof out === 'string' ? out.slice(0, 30000) : out;
    },
  }));
  const turns = [
    { role: 'user' as const, content: SYSTEM_PROMPT + '\n\nUse the atlas tools to research each question before answering.' },
    ...opts.history.slice(-8).map((t) => ({ role: t.role, content: t.text })),
    { role: 'user' as const, content: opts.sampler.canUseTools ? opts.question : withContext(opts.atlas, opts.question) },
  ];
  const { text, truncated } = await opts.sampler.sample(turns, {
    tools: opts.sampler.canUseTools ? tools : undefined,
    cache: false,
    signal: opts.signal,
    onText: ({ text }: { text: string }) => opts.onText?.(text),
  });
  return truncated ? `${text}\n\n*(The answer was cut short. Ask a narrower question to get the rest.)*` : text;
}

/** Where page tools are unavailable, hand Claude the best-matching entries inside the question instead. */
function withContext(a: Atlas, q: string) {
  const entries = getFuse(a)
    .search(q, { limit: 6 })
    .map((r) => describeEntry(a, r.item.type, r.item.id))
    .filter(Boolean)
    .map((e) => JSON.stringify(e).slice(0, 6000));
  return `${q}\n\nRelevant atlas entries (JSON):\n${entries.join('\n')}`;
}
