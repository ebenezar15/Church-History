import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Anthropic from '@anthropic-ai/sdk';
import { useAtlas, hrefFor, type Atlas } from '../data/db';
import { getFuse, type SearchDoc } from '../data/searchIndex';
import { askAtlas, DEFAULT_MODEL, MODELS, type Turn } from '../agent/run';
import type { ToolEvent } from '../agent/tools';
import { Icon } from '../components/Icon';
import { Markdown } from '../components/Markdown';
import { PageHeader, cx } from '../components/ui';

interface Msg { role: 'user' | 'assistant'; text: string; steps?: ToolEvent[]; mode?: 'agent' | 'librarian'; error?: boolean }

const KEY_STORE = 'ecclesia-anthropic-key';
const MODEL_STORE = 'ecclesia-agent-model';
const read = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const write = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* storage unavailable */ } };

const SUGGESTIONS = [
  'Why did the Church of the East separate from the churches of the Roman Empire?',
  'Trace the Assemblies of God back to the early church.',
  'Compare penal substitution with Christus Victor.',
  'What did the Council of Chalcedon decide, and who rejected it?',
  'How did Christianity reach Ethiopia and China?',
  'What is the difference between the legal and union views of the gospel?',
];

const STOP = new Set(['who', 'was', 'what', 'were', 'the', 'and', 'did', 'does', 'why', 'how', 'when', 'where', 'which', 'with', 'from', 'about', 'between', 'difference', 'tell', 'explain', 'church', 'christian', 'christianity', 'is', 'are', 'that', 'this', 'into', 'for', 'its', 'his', 'her', 'their']);

/** Without an API key the page still helps: it finds the most relevant entries and summarises each one. */
function librarianAnswer(a: Atlas, q: string): string {
  // Search on the question's key words, then favour entries whose titles contain them.
  const words = q.toLowerCase().match(/[\p{L}\d'-]{3,}/gu)?.filter((w) => !STOP.has(w)) ?? [];
  const fuse = getFuse(a);
  const pool = new Map<string, { item: SearchDoc; score: number }>();
  for (const term of [words.join(' '), ...words]) {
    if (!term) continue;
    for (const r of fuse.search(term, { limit: 15 })) {
      const key = r.item.type + r.item.id;
      const titleHits = words.filter((w) => r.item.title.toLowerCase().includes(w)).length;
      const score = (r.score ?? 1) - titleHits * 0.5;
      if (!pool.has(key) || pool.get(key)!.score > score) pool.set(key, { item: r.item, score });
    }
  }
  const hits = [...pool.values()].sort((x, y) => x.score - y.score).slice(0, 8).map((x) => x.item);
  if (!hits.length) return 'I couldn’t find entries matching that. Try naming a person, council, doctrine or denomination.';
  return [
    'Here are the atlas entries that best match your question:',
    hits.map((h) => `- [${h.title}](entity:${h.type}/${h.id}) — ${h.sub ? h.sub + '. ' : ''}${h.text.slice(0, 180)}${h.text.length > 180 ? '…' : ''}`).join('\n'),
    '*Add an Anthropic API key in settings to get a written answer that reasons across these entries.*',
  ].join('\n\n');
}

export default function Ask() {
  const a = useAtlas();
  const [params, setParams] = useSearchParams();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(params.get('q') ?? '');
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<ToolEvent[]>([]);
  const [apiKey, setApiKey] = useState(() => read(KEY_STORE));
  const [remember, setRemember] = useState(() => !!read(KEY_STORE));
  const [model, setModel] = useState(() => read(MODEL_STORE) || DEFAULT_MODEL);
  const [showSettings, setShowSettings] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const client = useMemo(() => (apiKey ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) : null), [apiKey]);

  useEffect(() => { write(KEY_STORE, remember ? apiKey : ''); }, [apiKey, remember]);
  useEffect(() => { write(MODEL_STORE, model); }, [model]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, live]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput('');
    if (params.get('q')) setParams({}, { replace: true });
    const history: Turn[] = msgs.filter((m) => !m.error && m.mode !== 'librarian').map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: q }]);

    if (!client) {
      setMsgs((m) => [...m, { role: 'assistant', text: librarianAnswer(a, q), mode: 'librarian' }]);
      return;
    }
    setBusy(true);
    setLive([]);
    const steps: ToolEvent[] = [];
    abort.current = new AbortController();
    try {
      const r = await askAtlas({
        client, atlas: a, history, question: q, model, signal: abort.current.signal,
        onEvent: (e) => { steps.push(e); setLive([...steps]); },
      });
      const text = r.refused ? 'The model declined to answer this one. Try rephrasing the question.' : r.text || '(No answer was returned.)';
      setMsgs((m) => [...m, { role: 'assistant', text, steps, mode: 'agent', error: r.refused }]);
    } catch (err) {
      let text = 'Something went wrong while asking Claude.';
      if (err instanceof Anthropic.APIUserAbortError) text = 'Stopped.';
      else if (err instanceof Anthropic.AuthenticationError) text = 'That API key was rejected. Check it in settings.';
      else if (err instanceof Anthropic.PermissionDeniedError) text = 'This API key does not have access to the selected model.';
      else if (err instanceof Anthropic.RateLimitError) text = 'Rate limited by the API. Wait a moment and try again.';
      else if (err instanceof Anthropic.APIConnectionError) text = 'Could not reach the Anthropic API. Check your connection.';
      else if (err instanceof Anthropic.APIError) text = `API error ${err.status}: ${err.message}`;
      setMsgs((m) => [...m, { role: 'assistant', text, steps, mode: 'agent', error: true }]);
    } finally {
      setBusy(false);
      setLive([]);
      abort.current = null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Learn"
        icon="sparkles"
        title="Ask the Atlas"
        actions={
          <>
            {msgs.length > 0 && <button className="btn" onClick={() => setMsgs([])}><Icon name="close" size={15} /> New chat</button>}
            <button className="btn" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}><Icon name="palette" size={15} /> Settings</button>
          </>
        }
      >
        An AI guide that answers questions about Church history, doctrine and denominations by searching and reading the atlas’s own sourced entries,
        then linking every entry it used. It presents each tradition in its own terms and never declares one correct.
      </PageHeader>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <div className="card space-y-4 p-5">
              <label className="block">
                <span className="mb-1 block text-sm font-bold">Anthropic API key</span>
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value.trim())} placeholder="sk-ant-…" autoComplete="off" className="w-full rounded-xl border border-line bg-bg px-3 py-2 outline-none focus:border-accent" />
                <span className="mt-1 block text-xs text-muted">
                  Sent only from your browser directly to Anthropic. Use a key with a spending limit. Get one at console.anthropic.com.
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-[var(--accent)]" />
                Remember this key on this device
              </label>
              <div>
                <span className="mb-1 block text-sm font-bold">Model</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MODELS.map((m) => (
                    <button key={m.id} onClick={() => setModel(m.id)} className={cx('rounded-xl border p-3 text-left text-sm transition', model === m.id ? 'border-accent bg-surface-2' : 'border-line hover:border-accent')} aria-pressed={model === m.id}>
                      <b className="block">{m.label}</b>
                      <span className="text-xs text-muted">{m.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!client && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-dashed border-line p-4 text-sm text-ink-2">
          <Icon name="info" className="mt-0.5 shrink-0 text-accent" />
          <span>
            No API key set, so answers come from <b>librarian mode</b>: the most relevant atlas entries with summaries.{' '}
            <button className="font-semibold text-accent underline" onClick={() => setShowSettings(true)}>Add a key</button> for full written answers.
          </span>
        </div>
      )}

      <div className="space-y-4" aria-live="polite">
        {msgs.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s, i) => (
              <motion.button key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} onClick={() => send(s)} className="card p-4 text-left text-sm transition hover:-translate-y-0.5 hover:border-accent">
                <Icon name="question" size={15} className="mb-1 text-accent" />
                {s}
              </motion.button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-accent-ink">{m.text}</div>
            ) : (
              <div className={cx('card w-full max-w-[95%] rounded-bl-md p-5', m.error && 'border-bad/50')}>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
                  <Icon name={m.mode === 'librarian' ? 'book' : 'sparkles'} size={13} className="text-accent" />
                  {m.mode === 'librarian' ? 'Librarian mode' : 'Atlas guide'}
                </div>
                {m.steps && m.steps.length > 0 && (
                  <details className="mb-3 text-xs text-muted">
                    <summary className="cursor-pointer">Consulted the atlas {m.steps.length} time{m.steps.length > 1 ? 's' : ''}</summary>
                    <ul className="mt-1 space-y-0.5 pl-4">{m.steps.map((s, j) => <li key={j}>{s.summary}</li>)}</ul>
                  </details>
                )}
                <div className="text-ink-2"><Markdown text={m.text} /></div>
              </div>
            )}
          </motion.div>
        ))}
        {busy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card max-w-[95%] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-accent">
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}><Icon name="coptic-cross" /></motion.span>
              Researching…
              <button className="btn ml-auto !py-1 text-xs" onClick={() => abort.current?.abort()}>Stop</button>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              <AnimatePresence initial={false}>
                {live.map((s, j) => <motion.li key={j} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>· {s.summary}</motion.li>)}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-3 mt-6">
        <div className="card flex items-end gap-2 p-2 shadow-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={Math.min(5, Math.max(1, input.split('\n').length))}
            placeholder="Ask about a council, a doctrine, a denomination, a person…"
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 outline-none"
            aria-label="Your question"
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()} aria-label="Ask">
            <Icon name="arrow" size={16} />
          </button>
        </div>
        <p className="mt-1 px-2 text-center text-[11px] text-muted">
          AI answers can be wrong — follow the links to check each entry and its sources. <Link to={hrefFor('path', 'how-the-trinity-was-defined')} className="underline">Prefer a guided tour?</Link>
        </p>
      </form>
    </div>
  );
}
