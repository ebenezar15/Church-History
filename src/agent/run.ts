import type Anthropic from '@anthropic-ai/sdk';
import type { Atlas } from '../data/db';
import { createAtlasTools, SYSTEM_PROMPT, type ToolEvent } from './tools';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', note: 'Most thorough (default)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', note: 'Faster, lower cost' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', note: 'Fastest, lowest cost' },
] as const;
export const DEFAULT_MODEL = MODELS[0].id;

/** One prior turn of the conversation, kept as plain text. */
export interface Turn { role: 'user' | 'assistant'; text: string }

export interface AgentResult { text: string; refused: boolean; model: string }

/**
 * Runs one question through the tool-using agent. Earlier turns are replayed as plain text only,
 * so history is append-only and never carries thinking blocks across turns.
 */
export async function askAtlas(opts: {
  client: Anthropic;
  atlas: Atlas;
  history: Turn[];
  question: string;
  model?: string;
  onEvent?: (e: ToolEvent) => void;
  signal?: AbortSignal;
}): Promise<AgentResult> {
  const model = opts.model ?? DEFAULT_MODEL;
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...opts.history.map((t) => ({ role: t.role, content: t.text })),
    { role: 'user', content: opts.question },
  ];
  // Server-side refusal fallback is available on Opus 5.5 and Sonnet 5.5 (not Haiku).
  const fallback = model === 'claude-haiku-5-5' ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };

  const runner = opts.client.beta.messages.toolRunner(
    {
      model,
      max_tokens: 16000,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: createAtlasTools(opts.atlas, opts.onEvent),
      messages,
      output_config: { effort: 'medium' },
      max_iterations: 12,
      ...fallback,
    },
    { signal: opts.signal },
  );

  let last: Anthropic.Beta.BetaMessage | undefined;
  for await (const message of runner) last = message;
  if (!last) return { text: '', refused: false, model };

  const text = last.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n')
    .trim();
  return { text, refused: last.stop_reason === 'refusal', model: last.model };
}
