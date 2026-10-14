import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUi } from '../store/ui';
import { hrefFor } from '../data/db';
import { Icon } from '../components/Icon';
import { PageHeader, Empty } from '../components/ui';

export default function Saved() {
  const { bookmarks, toggleBookmark, setNote } = useUi();
  return (
    <div>
      <PageHeader eyebrow="Learn" icon="bookmark" title="Saved & Notes">
        Your bookmarks and notes live in this browser only (nothing is uploaded). Use the Save button on any page.
      </PageHeader>
      {bookmarks.length === 0 && <Empty><Icon name="bookmark" size={36} className="mx-auto mb-2 text-accent" />Nothing saved yet.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        <AnimatePresence>
          {bookmarks.map((b) => (
            <motion.div layout key={b.type + b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 60 }} className="card p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted">{b.type}</div>
                  <Link to={hrefFor(b.type, b.id)} className="font-bold hover:text-accent">{b.label}</Link>
                </div>
                <button className="text-muted hover:text-bad" onClick={() => toggleBookmark(b)} aria-label={`Remove ${b.label}`}><Icon name="close" /></button>
              </div>
              <textarea value={b.note} onChange={(e) => setNote(b.type, b.id, e.target.value)} placeholder="Add a note…" rows={3} className="w-full resize-y rounded-xl border border-line bg-bg p-2 text-sm outline-none focus:border-accent" aria-label={`Note for ${b.label}`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
