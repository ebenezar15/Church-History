/**
 * Tamil interface runtime. Content arrives already translated (see data/db.ts); this translates
 * the interface while Tamil is switched on. Every text node and title/placeholder/aria-label is looked up in the
 * UI dictionary (numbers act as `#` placeholders), and year labels (AD/BC/c.) are localised.
 * A MutationObserver keeps doing so as React renders, so components need no changes.
 */
import '@fontsource/noto-sans-tamil/tamil-400.css';
import '@fontsource/noto-sans-tamil/tamil-600.css';
import '@fontsource/noto-sans-tamil/tamil-700.css';
import dict from '../generated/ui-strings.json';
import { isTA, onLang } from './lang';

const D = new Map<string, string>();
for (const [k, v] of Object.entries(dict as Record<string, string>)) {
  if (!v || v === k) continue;
  D.set(k, v);
  D.set(k.toLowerCase(), v);
}
const ATTRS = ['title', 'placeholder', 'aria-label'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE']);

function years(s: string) {
  return s
    .replace(/\bc\. ?(?=(AD )?\d)/g, 'சுமார் ')
    .replace(/\bAD ?(\d)/g, 'கி.பி. $1')
    .replace(/(\d+) ?BC\b/g, 'கி.மு. $1')
    .replace(/(\d+)(?:st|nd|rd|th) c\./g, '$1-ஆம் நூ.')
    .replace(/\btoday\b/g, 'இன்று');
}

export function tr(raw: string): string {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (!t || !/[A-Za-z]/.test(t)) return raw;
  let hit = D.get(t) ?? D.get(t.toLowerCase());
  if (hit === undefined && /\d/.test(t)) {
    const nums = t.match(/\d+/g)!;
    const tpl = t.replace(/\d+/g, '#');
    const h = D.get(tpl) ?? D.get(tpl.toLowerCase());
    if (h !== undefined) {
      let i = 0;
      hit = h.replace(/#/g, () => nums[i++] ?? '');
    }
  }
  if (hit === undefined) {
    const y = years(t);
    if (y === t) return raw;
    hit = y;
  }
  // keep surrounding whitespace so inline text still flows
  const lead = raw.match(/^\s*/)![0];
  const trail = raw.match(/\s*$/)![0];
  return lead + hit + trail;
}

const done = new WeakMap<Node, string>();
function textNode(n: Text) {
  if (!isTA()) return;
  const v = n.nodeValue ?? '';
  if (done.get(n) === v) return;
  const p = n.parentElement;
  if (p && (SKIP.has(p.tagName) || p.closest('[data-no-tr]'))) return;
  const out = tr(v);
  done.set(n, out);
  if (out !== v) n.nodeValue = out;
}
function element(el: Element) {
  if (!isTA() || SKIP.has(el.tagName)) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const out = tr(v);
      if (out !== v) el.setAttribute(a, out);
    }
  }
}
function walk(root: Node) {
  if (root.nodeType === 3) return textNode(root as Text);
  if (root.nodeType !== 1) return;
  element(root as Element);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  while (w.nextNode()) {
    const n = w.currentNode;
    if (n.nodeType === 3) textNode(n as Text);
    else element(n as Element);
  }
}

function setDocument() {
  document.documentElement.lang = isTA() ? 'ta' : 'en';
  document.title = isTA() ? 'Ecclesia Atlas · தமிழ்' : 'Ecclesia Atlas';
}

/** Starts watching the page. Switching language remounts the app (see main.tsx), so English needs no undo. */
export function install() {
  setDocument();
  onLang(() => {
    setDocument();
    if (isTA() && document.body) walk(document.body);
  });
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') textNode(m.target as Text);
      else if (m.type === 'attributes') element(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  const start = () => {
    walk(document.body);
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start();
  else addEventListener('DOMContentLoaded', start);
}
