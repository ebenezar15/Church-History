import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Doctrine, Quote } from '../data/schema';
import { useAtlas, hrefFor, labelFor } from '../data/db';
import { FLOW_KIND_META, formatYear } from '../data/families';

// How a step relates to an earlier one (edges always run from the earlier step to the later).
const RELATION: Record<string, string> = {
  supports: 'Supported by', objects: 'Challenges', responds: 'Responds to', develops: 'Develops', rejects: 'Rejects', 'leads-to': 'Follows from', decides: 'Settled by',
};
import { Icon } from '../components/Icon';
import { QuoteBlock } from '../components/ui';

/**
 * The doctrine's development as a readable, dated sequence: every flowchart node in order with its full
 * text, links, quotes and how it connects to earlier steps. The default view on phones, and an
 * accessible alternative to the chart everywhere.
 */
export function DoctrineStory({ doctrine }: { doctrine: Doctrine }) {
  const a = useAtlas();
  const byId = new Map(doctrine.flow.nodes.map((n) => [n.id, n]));
  const nodes = [...doctrine.flow.nodes].sort((x, y) => (x.year ?? -99999) - (y.year ?? -99999));
  const incoming = (id: string) => doctrine.flow.edges.filter((e) => e.to === id && byId.has(e.from));

  return (
    <ol className="relative space-y-4 border-l-2 border-line pl-6 sm:pl-8">
      {nodes.map((n, i) => {
        const m = FLOW_KIND_META[n.kind];
        const ins = incoming(n.id);
        return (
          <motion.li key={n.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 20) * 0.03 }} className="relative">
            <span className="absolute -left-[37px] top-3 flex h-6 w-6 items-center justify-center rounded-full bg-surface ring-2 sm:-left-[45px]" style={{ color: m.colour, ['--tw-ring-color' as string]: m.colour }}>
              <Icon name={m.icon} size={13} />
            </span>
            <div className="card p-4" style={{ borderLeft: `4px solid ${m.colour}` }}>
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: m.colour }}>
                {m.label}
                {n.year !== undefined && <span className="tabular-nums text-muted">{formatYear(n.year)}</span>}
              </div>
              <h3 className="text-base font-bold leading-snug text-ink">{n.label}</h3>
              {n.text && <p className="mt-1 leading-relaxed text-ink-2">{n.text}</p>}
              {ins.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  {ins.map((e, j) => (
                    <span key={j}>
                      {j > 0 && ' · '}
                      {RELATION[e.kind] ?? 'Follows'}: <b className="text-ink-2">{byId.get(e.from)?.label}</b>
                    </span>
                  ))}
                </p>
              )}
              {n.ref && !!a.get(n.ref.type, n.ref.id) && (
                <Link to={hrefFor(n.ref.type, n.ref.id)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent underline decoration-accent/30 underline-offset-2">
                  Read more: {labelFor(a, n.ref.type, n.ref.id)} <Icon name="arrow" size={13} />
                </Link>
              )}
              {n.quoteIds.length > 0 && (
                <div className="mt-3 space-y-2">
                  {n.quoteIds.map((qid) => {
                    const q = a.get<Quote>('quote', qid);
                    return q ? <QuoteBlock key={qid} text={q.text} kind={q.kind} by={labelFor(a, 'person', q.personId)} citation={q.citation} /> : null;
                  })}
                </div>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
