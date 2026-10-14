import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { hrefFor } from '../data/db';
import { EntityType } from '../data/schema';

/**
 * A deliberately small markdown renderer for agent answers: paragraphs, bullet and numbered lists,
 * > quotes, ---, **bold**, *italic*, `code`, and links (nested inside bold too). It builds React
 * elements (never raw HTML), so answer text cannot inject markup. Links of the form
 * entity:TYPE/ID become in-app links.
 */
export function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let i = 0;
  let key = 0;
  const take = (re: RegExp) => {
    const got: string[] = [];
    while (i < lines.length && re.test(lines[i])) got.push(lines[i++]);
    return got;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (/^\s*[-*•]\s+/.test(line)) {
      const items = take(/^\s*[-*•]\s+/);
      out.push(<ul key={key++} className="list-disc space-y-1 pl-5">{items.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>)}</ul>);
    } else if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = take(/^\s*\d+[.)]\s+/);
      out.push(<ol key={key++} className="list-decimal space-y-1 pl-5">{items.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>)}</ol>);
    } else if (/^\s*>/.test(line)) {
      const q = take(/^\s*>/).map((l) => l.replace(/^\s*>\s?/, ''));
      out.push(<blockquote key={key++} className="border-l-4 border-accent/50 pl-3 font-serif text-lg leading-snug text-ink">{inline(q.join(' '))}</blockquote>);
    } else if (/^\s*---+\s*$/.test(line)) {
      i++;
      out.push(<hr key={key++} className="gold-rule my-2" />);
    } else if (/^#{1,4}\s+/.test(line)) {
      i++;
      out.push(<h3 key={key++} className="pt-1 text-lg font-bold">{inline(line.replace(/^#{1,4}\s+/, ''))}</h3>);
    } else {
      const para = take(/^(?!\s*([-*•]\s|\d+[.)]\s|>|---+\s*$|#{1,4}\s)).*\S/);
      out.push(<p key={key++}>{para.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>);
    }
  }
  return <div className="space-y-3 leading-relaxed">{out}</div>;
}

const TOKEN = /(\*\*(?:(?!\*\*).)+\*\*|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|`[^`]+`)/g;

function inline(s: string): ReactNode[] {
  return s.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={i} className="text-ink">{inline(part.slice(2, -2))}</strong>;
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
    if (part.startsWith('`')) return <code key={i} className="rounded bg-surface-2 px-1 text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={i}>{inline(part.slice(1, -1))}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
