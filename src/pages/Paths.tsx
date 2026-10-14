import { motion } from 'framer-motion';
import { useAtlas } from '../data/db';
import { useUi } from '../store/ui';
import { Icon } from '../components/Icon';
import { GlowCard, PageHeader, Empty } from '../components/ui';
import { DOCTRINE_ICON } from './Doctrines';

export default function Paths() {
  const a = useAtlas();
  const scores = useUi((s) => s.quizScores);
  return (
    <div>
      <PageHeader eyebrow="Learn" icon="compass" title="Study Paths">
        Guided, step-by-step walkthroughs through the atlas, each ending with a short quiz. Your best scores are remembered on this device.
      </PageHeader>
      {a.paths.length === 0 && <Empty>Study paths are still being written.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {a.paths.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <GlowCard to={`/paths/${p.id}`}>
              <div className="flex gap-4">
                <motion.div whileHover={{ scale: 1.15, rotate: 10 }} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink">
                  <Icon name={DOCTRINE_ICON[p.icon]} size={28} />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold">{p.title}</h2>
                  <p className="mt-1 text-sm text-ink-2">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="chip">{p.steps.length} steps</span>
                    {p.quiz.length > 0 && <span className="chip">{p.quiz.length}-question quiz</span>}
                    {scores[p.id] !== undefined && <span className="chip !text-good"><Icon name="check" size={12} /> Best {scores[p.id]}/{p.quiz.length}</span>}
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
