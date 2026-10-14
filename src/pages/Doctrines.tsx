import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { Icon, type IconName } from '../components/Icon';
import { GlowCard, PageHeader, Empty } from '../components/ui';

export const DOCTRINE_ICON: Record<string, IconName> = {
  trinity: 'trinity', cross: 'cross', book: 'book', dove: 'dove', flame: 'flame', crown: 'crown', chalice: 'chalice',
  water: 'water', scroll: 'scroll', hourglass: 'hourglass', star: 'star', scales: 'scales', globe: 'globe',
};

export default function Doctrines() {
  const a = useAtlas();
  return (
    <div>
      <PageHeader eyebrow="Think" icon="trinity" title="Doctrine Explorer">
        Every doctrine as something that <em>developed</em>: the question that prompted it, the Scriptures and early voices,
        the rival answers, the decisions and the fallout. Open one to play its development as an animated flowchart.
      </PageHeader>
      {a.doctrines.length === 0 && <Empty>Doctrine content is still being written.</Empty>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {a.doctrines.map((d, i) => {
          const ps = a.positionsByDoctrine.get(d.id) ?? [];
          return (
            <motion.div key={d.id} initial={{ opacity: 0, y: 24, rotateX: -15 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 20 }} style={{ transformPerspective: 900 }}>
              <GlowCard to={`/doctrines/${d.id}`}>
                <div className="mb-3 flex items-center gap-3">
                  <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.8 }} className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-accent ring-1 ring-line">
                    <Icon name={DOCTRINE_ICON[d.icon]} size={26} />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">{d.name}</h2>
                    <div className="text-xs text-muted">{ps.length} positions · {d.flow.nodes.length} nodes</div>
                  </div>
                </div>
                <p className="mb-3 font-serif text-lg italic leading-snug text-ink-2">“{d.question}”</p>
                <div className="flex flex-wrap gap-1">
                  {ps.slice(0, 5).map((p) => <span key={p.id} className="chip">{p.name}</span>)}
                  {ps.length > 5 && <span className="chip">+{ps.length - 5}</span>}
                </div>
              </GlowCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
