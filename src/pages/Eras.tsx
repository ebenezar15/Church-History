import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAtlas } from '../data/db';
import { formatYear, inkTone } from '../data/families';
import { PageHeader } from '../components/ui';
import { NOW } from '../viz/river';

export default function Eras() {
  const a = useAtlas();
  return (
    <div>
      <PageHeader eyebrow="Explore" icon="hourglass" title="Eras & Life in the Church">
        Thirteen eras, each with its events, people and a “Life in the Church” panel on worship, music, architecture, women, missions and more — East and West, North and South.
      </PageHeader>
      <ol className="relative ml-3 border-l-2 border-line">
        {a.eras.map((e, i) => (
          <motion.li key={e.id} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.03 }} className="relative mb-6 pl-8">
            <motion.span className="absolute -left-[11px] top-5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: e.colour }} whileInView={{ scale: [0, 1.3, 1] }} viewport={{ once: true }}>
              {i + 1}
            </motion.span>
            <Link to={`/eras/${e.id}`} className="card group block p-5 transition hover:-translate-y-0.5 hover:shadow-xl" style={{ borderLeft: `4px solid ${e.colour}` }}>
              <div className="text-sm font-bold tabular-nums text-muted">{formatYear(e.startYear)} – {e.endYear >= NOW ? 'today' : formatYear(e.endYear)}</div>
              <h2 className="text-2xl font-bold transition group-hover:translate-x-1" style={{ color: inkTone(e.colour) }}>{e.name}</h2>
              <p className="mt-1 max-w-3xl text-ink-2">{e.summary}</p>
              <div className="mt-3 flex flex-wrap gap-1">{e.keyThemes.map((k) => <span key={k} className="chip">{k}</span>)}</div>
              <div className="mt-3 text-xs text-muted">{a.eventsByEra.get(e.id)?.length ?? 0} events</div>
            </Link>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
