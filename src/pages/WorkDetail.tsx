import { useParams } from 'react-router-dom';
import { useAtlas } from '../data/db';
import type { Work } from '../data/schema';
import { formatYear } from '../data/families';
import { Icon } from '../components/Icon';
import { BookmarkButton, EntityChips, EntityLink, PageHeader, QuoteBlock, Section, Sources } from '../components/ui';
import NotFound from './NotFound';

export default function WorkDetail() {
  const { id = '' } = useParams();
  const a = useAtlas();
  const w = a.get<Work>('work', id);
  if (!w) return <NotFound />;
  const quotes = a.quotesByWork.get(w.id) ?? [];
  return (
    <div>
      <PageHeader eyebrow={`${w.genre} · ${formatYear(w.year, w.circa)} · ${w.language}`} icon="book" title={<span className="font-serif">{w.title}</span>} actions={<BookmarkButton type="work" id={w.id} label={w.title} />}>
        <p>by {w.authorId ? <EntityLink type="person" id={w.authorId} /> : w.author ?? 'unknown'}</p>
      </PageHeader>
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <Section title="Summary" icon="scroll"><p className="illuminated leading-relaxed text-ink-2">{w.summary}</p></Section>
          <Section title="Significance" icon="star"><p className="leading-relaxed text-ink-2">{w.significance}</p></Section>
          {quotes.length > 0 && <Section title="Key passages" icon="quote"><div className="grid gap-3">{quotes.map((q) => <QuoteBlock key={q.id} text={q.text} kind={q.kind} citation={q.citation} />)}</div></Section>}
        </div>
        <aside>
          {w.fullTextUrl && <a href={w.fullTextUrl} target="_blank" rel="noreferrer" className="btn btn-primary mb-6 w-full">Read the full text <Icon name="external" size={15} /></a>}
          {w.doctrineIds.length > 0 && <Section title="Doctrines" icon="trinity"><EntityChips type="doctrine" ids={w.doctrineIds} /></Section>}
        </aside>
      </div>
      <Sources ids={w.sources} />
    </div>
  );
}
