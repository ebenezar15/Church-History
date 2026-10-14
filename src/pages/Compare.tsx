import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { useUi, MAX_COMPARE } from '../store/ui';
import { FAMILIES } from '../data/families';
import { Icon } from '../components/Icon';
import { PageHeader, Tabs, cx } from '../components/ui';
import { PositionCompareTable, TraditionCompareTable } from '../components/PositionTable';

const PRESETS = [
  { label: 'The three great families', ids: ['catholic', 'eastern-orthodox', 'lutheran', 'reformed'] },
  { label: 'Ancient churches of the East', ids: ['eastern-orthodox', 'oriental-orthodox', 'church-of-the-east'] },
  { label: 'Radical & free churches', ids: ['anabaptist', 'baptist', 'quaker', 'pentecostal'] },
  { label: 'Restorationist movements', ids: ['stone-campbell-restoration', 'seventh-day-adventist', 'latter-day-saints', 'jehovahs-witnesses'] },
];

export default function Compare() {
  const a = useAtlas();
  const { compare, toggleCompare, clearCompare } = useUi();
  const traditions = compare.filter((c) => c.type === 'tradition').map((c) => c.id);
  const positions = compare.filter((c) => c.type === 'position').map((c) => c.id);
  const [tab, setTab] = useState<'tradition' | 'position'>(traditions.length >= 2 || positions.length < 2 ? 'tradition' : 'position');
  const [pick, setPick] = useState('');

  const loadPreset = (ids: string[]) => { clearCompare(); ids.filter((id) => a.get('tradition', id)).forEach((id) => toggleCompare({ type: 'tradition', id })); setTab('tradition'); };
  const options = tab === 'tradition' ? a.traditions.map((t) => ({ id: t.id, name: t.name })) : a.positions.map((p) => ({ id: p.id, name: `${p.name} (${a.doctrinesByPosition.get(p.id)?.name ?? ''})` }));
  const current = tab === 'tradition' ? traditions : positions;

  return (
    <div>
      <PageHeader eyebrow="Think" icon="layers" title="Compare">
        Put 2–{MAX_COMPARE} traditions or doctrinal positions side by side: authority, salvation, sacraments, eschatology, governance and worship.
      </PageHeader>
      <div className="mb-4"><Tabs layoutId="cmp-tabs" value={tab} onChange={setTab} tabs={[{ id: 'tradition', label: `Traditions (${traditions.length})`, icon: 'tree' }, { id: 'position', label: `Positions (${positions.length})`, icon: 'branch' }]} /></div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {current.map((id) => (
          <motion.button layout key={id} initial={{ scale: 0 }} animate={{ scale: 1 }} className="chip hover:border-bad" onClick={() => toggleCompare({ type: tab, id })}>
            {tab === 'tradition' && (() => { const t = a.get<{ family: keyof typeof FAMILIES }>('tradition', id); return t ? <Icon name={FAMILIES[t.family].icon} size={12} style={{ color: FAMILIES[t.family].colour }} /> : null; })()}
            {options.find((o) => o.id === id)?.name ?? id} <Icon name="close" size={11} />
          </motion.button>
        ))}
        <select className="btn" value={pick} onChange={(e) => { if (e.target.value) toggleCompare({ type: tab, id: e.target.value }); setPick(''); }} aria-label={`Add a ${tab}`}>
          <option value="">+ Add a {tab}…</option>
          {options.filter((o) => !current.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>

      {tab === 'tradition' && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="self-center text-sm text-muted">Presets:</span>
          {PRESETS.map((p) => <button key={p.label} className="chip cursor-pointer hover:border-accent" onClick={() => loadPreset(p.ids)}>{p.label}</button>)}
        </div>
      )}

      {current.length < 2 ? (
        <div className={cx('card p-10 text-center text-muted')}>
          <Icon name="layers" size={36} className="mx-auto mb-3 text-accent" />
          Add at least two {tab}s — from here, or with the “Compare” button on any {tab} page{tab === 'position' && <> (try the <Link className="text-accent underline" to="/doctrines">doctrine explorer</Link>)</>}.
        </div>
      ) : tab === 'tradition' ? <TraditionCompareTable key={current.join()} ids={current} /> : <PositionCompareTable key={current.join()} ids={current} />}
    </div>
  );
}
