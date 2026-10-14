import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import type { Position, Tradition } from '../data/schema';
import { EntityChips, EntityLink } from './ui';
import { FAMILIES, formatYear } from '../data/families';
import { Icon } from './Icon';

const ROWS: { label: string; render: (p: Position) => React.ReactNode }[] = [
  { label: 'In one line', render: (p) => p.oneLine },
  { label: 'Core claims', render: (p) => <List items={p.coreClaims} /> },
  { label: 'Key texts', render: (p) => <List items={p.keyTexts} /> },
  { label: 'Origin', render: (p) => <>{p.originYear !== undefined && <b>{formatYear(p.originYear)} · </b>}{p.origin}</> },
  { label: 'Proponents', render: (p) => (<><EntityChips type="person" ids={p.proponentIds} />{p.proponentsOther.length > 0 && <div className="mt-1 text-xs text-muted">{p.proponentsOther.join(', ')}</div>}</>) },
  { label: 'Held by', render: (p) => <EntityChips type="tradition" ids={p.traditionIds} /> },
  { label: 'Strongest arguments', render: (p) => <List items={p.strongestArguments} /> },
  { label: 'Strongest objections', render: (p) => <List items={p.strongestObjections} /> },
  { label: 'Consequences', render: (p) => <List items={p.consequences} /> },
];

function List({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted">—</span>;
  return <ul className="list-disc space-y-1 pl-4">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

export function PositionCompareTable({ ids }: { ids: string[] }) {
  const a = useAtlas();
  const ps = ids.map((id) => a.get<Position>('position', id)).filter(Boolean) as Position[];
  if (ps.length < 2) return null;
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className="grid min-w-[640px] gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm" style={{ gridTemplateColumns: `160px repeat(${ps.length}, minmax(220px, 1fr))` }}>
        <div className="bg-surface-2 p-3" />
        {ps.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-surface-2 p-3">
            <EntityLink type="position" id={p.id} className="text-base" />
            <div className="text-xs text-muted">{a.doctrinesByPosition.get(p.id)?.name}</div>
          </motion.div>
        ))}
        {ROWS.map((r, ri) => (
          <Fragment key={r.label}>
            <div className="bg-surface p-3 font-bold text-ink-2">{r.label}</div>
            {ps.map((p, i) => (
              <motion.div key={p.id + r.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + ri * 0.04 + i * 0.02 }} className="bg-surface p-3 leading-relaxed text-ink-2">
                {r.render(p)}
              </motion.div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

const T_ROWS: { key: keyof Tradition['profile'] | 'distinctives' | 'adherents' | 'founded'; label: string }[] = [
  { key: 'founded', label: 'Emerged' },
  { key: 'adherents', label: 'Adherents' },
  { key: 'authority', label: 'Authority' },
  { key: 'salvation', label: 'Salvation' },
  { key: 'sacraments', label: 'Sacraments' },
  { key: 'eschatology', label: 'Eschatology' },
  { key: 'governance', label: 'Governance' },
  { key: 'worship', label: 'Worship' },
  { key: 'canon', label: 'Canon' },
  { key: 'distinctives', label: 'Distinctives' },
];

export function TraditionCompareTable({ ids }: { ids: string[] }) {
  const a = useAtlas();
  const ts = ids.map((id) => a.get<Tradition>('tradition', id)).filter(Boolean) as Tradition[];
  if (ts.length < 2) return null;
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className="grid min-w-[640px] gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm" style={{ gridTemplateColumns: `140px repeat(${ts.length}, minmax(200px, 1fr))` }}>
        <div className="bg-surface-2 p-3" />
        {ts.map((t, i) => {
          const f = FAMILIES[t.family];
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-surface-2 p-3" style={{ borderTop: `4px solid ${f.colour}` }}>
              <div className="flex items-center gap-1.5"><Icon name={f.icon} style={{ color: f.colour }} /><EntityLink type="tradition" id={t.id} className="text-base" /></div>
              <div className="text-xs text-muted">{f.label}</div>
            </motion.div>
          );
        })}
        {T_ROWS.map((r, ri) => (
          <Fragment key={r.key}>
            <div className="bg-surface p-3 font-bold text-ink-2">{r.label}</div>
            {ts.map((t, i) => (
              <motion.div key={t.id + r.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + ri * 0.04 + i * 0.02 }} className="bg-surface p-3 leading-relaxed text-ink-2">
                {r.key === 'founded' ? formatYear(t.foundedYear) : r.key === 'adherents' ? (t.adherents ? `~${(t.adherents.estimate / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })} million (${t.adherents.source}, ${t.adherents.year})` : '—') : r.key === 'distinctives' ? <List items={t.distinctives} /> : t.profile[r.key]}
              </motion.div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
