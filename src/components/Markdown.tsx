import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { hrefFor } from '../data/db';
import { EntityType } from '../data/schema';

/**
 * A deliberately small markdown renderer for agent answers: paragraphs, bullet/numbered lists,
 * **bold**, *italic*, `code`, and links. Builds React elements (never raw HTML), so model output
 * cannot inject markup. Links of the form entity:TYPE/ID become in-app links.
 */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/);
  return (
    <div className="space-y-3 leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter((l) => l.trim());
        if (!lines.length) return null;
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>)}</ul>;
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return <ol key={i} className="list-decimal space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>)}</ol>;
        }
        const h = /^(#{1,4})\s+(.*)$/.exec(lines[0]);
        if (h && lines.length === 1) return <h3 key={i} className="pt-1 text-lg font-bold">{inline(h[2])}</h3>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l.replace(/^#{1,4}\s+/, ''))}</Fragment>)}</p>;
      })}
    </div>
  );
}

const TOKEN = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g;

function inline(s: string): ReactNode[] {
  return s.split(TOKEN).map((part, i) => {
    if (!part) return null;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      const ent = /^entity:([a-z]+)\/([a-z0-9-]+)$/.exec(href);
      if (ent && EntityType.safeParse(ent[1]).success) {
        return <Link key={i} to={hrefFor(ent[1] as EntityType, ent[2])} className="font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">{label}</Link>;
      }
      if (/^https?:\/\//.test(href)) return <a key={i} href={href} target="_blank" rel="noreferrer noopener" className="text-accent underline">{label}</a>;
      return <Fragment key={i}>{label}</Fragment>;
    }
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={i} className="rounded bg-surface-2 px-1 text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
