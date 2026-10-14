import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { GlowCard, PageHeader, Empty } from '../components/ui';
import { Icon } from '../components/Icon';

const RES_LABEL: Record<string, string> = { council: 'Decided by council', schism: 'Ended in schism', open: 'Still open', mixed: 'Mixed outcome', faded: 'Faded', dialogue: 'In ecumenical dialogue' };

export default function Debates() {
  const a = useAtlas();
  return (
    <div>
      <PageHeader eyebrow="Think" icon="scales" title="Debate Arena">
        Pick a controversy. Each side makes its best case in its own voice; then come the counter-arguments, key texts, the outcome and its consequences.
      </PageHeader>
      {a.controversies.length === 0 && <Empty>Debates are still being written.</Empty>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {a.controversies.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
            <GlowCard to={`/debates/${c.id}`}>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
                <Icon name="scales" size={13} /> {RES_LABEL[c.resolution.kind]}
              </div>
              <h2 className="text-lg font-bold leading-snug">{c.title}</h2>
              <p className="my-2 font-serif text-lg italic text-ink-2">{c.question}</p>
              <div className="flex flex-wrap items-center gap-1">
                {c.sides.map((s, j) => (
                  <span key={s.name} className="flex items-center gap-1">
                    {j > 0 && <span className="text-xs font-bold text-accent">vs</span>}
                    <span className="chip">{s.name}</span>
                  </span>
                ))}
              </div>
            </GlowCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
