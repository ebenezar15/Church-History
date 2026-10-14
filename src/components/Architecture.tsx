import { motion } from 'framer-motion';

/** Simple schematic plans/elevations of church architecture, drawn in SVG (no copyrighted imagery). */
const SHAPES: Record<string, { label: string; caption: string; paths: string[] }> = {
  'house-church': { label: 'House church', caption: 'A domestic room adapted for worship, like the Dura-Europos house (c. 232): courtyard, assembly hall, baptistery.', paths: ['M20 120 L20 50 L100 20 L180 50 L180 120 Z', 'M40 120 V75 H90 V120', 'M120 70 H160 V100 H120 Z', 'M130 95 Q140 85 150 95'] },
  catacomb: { label: 'Catacomb', caption: 'Underground galleries with loculi (wall niches) and cubicula (chambers) where Christians buried and commemorated the dead.', paths: ['M10 70 H190', 'M50 70 V30 M50 70 V110', 'M120 70 V20 M120 70 V115', 'M30 62 h12 M30 78 h12 M60 40 h12 M60 100 h12 M130 30 h12 M130 105 h12 M160 62 h12 M160 78 h12', 'M150 55 a12 12 0 1 1 0 30 a12 12 0 1 1 0 -30'] },
  basilica: { label: 'Basilica', caption: 'The Roman hall adopted after 313: nave, side aisles, apse at the east, atrium at the entrance.', paths: ['M20 40 H160 V100 H20 Z', 'M160 50 Q195 70 160 90', 'M20 55 H160 M20 85 H160', 'M40 55 v0 M60 55 v0', 'M0 50 H20 M0 90 H20 M0 50 V90'] },
  'cross-in-square': { label: 'Cross-in-square', caption: 'The Byzantine plan: a central dome on four piers, arms forming a cross within a square, apses to the east.', paths: ['M40 20 H160 V120 H40 Z', 'M80 20 V120 M120 20 V120 M40 55 H160 M40 85 H160', 'M100 70 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', 'M160 55 Q185 70 160 85'] },
  romanesque: { label: 'Romanesque', caption: 'Thick walls, round arches, barrel vaults and towers; pilgrimage churches with ambulatories (c. 1000–1150).', paths: ['M30 120 V60 H170 V120', 'M30 60 L100 25 L170 60', 'M60 120 V90 Q75 70 90 90 V120', 'M110 120 V90 Q125 70 140 90 V120', 'M95 50 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0'] },
  gothic: { label: 'Gothic', caption: 'Pointed arches, rib vaults and flying buttresses let walls dissolve into stained glass (from c. 1140, Saint-Denis).', paths: ['M60 120 V45 L100 10 L140 45 V120', 'M80 120 V70 Q90 45 100 40 Q110 45 120 70 V120', 'M100 85 m-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0', 'M60 70 L30 95 V120 M140 70 L170 95 V120', 'M20 120 H180'] },
  'meeting-house': { label: 'Meeting house', caption: 'Plain Protestant or Quaker rooms centred on the pulpit or silence; clear glass, benches, no altar.', paths: ['M30 120 V60 L100 30 L170 60 V120 Z', 'M55 75 H75 V100 H55 Z M125 75 H145 V100 H125 Z', 'M90 120 V85 H110 V120'] },
  auditorium: { label: 'Auditorium church', caption: 'Nineteenth-century revival halls: curved pews and galleries focused on the preacher and choir (the “Akron plan”).', paths: ['M20 120 Q100 30 180 120', 'M45 120 Q100 55 155 120', 'M70 120 Q100 80 130 120', 'M90 40 H110 V55 H90 Z'] },
  megachurch: { label: 'Megachurch', caption: 'Arena-style worship centres with stage, screens and band, seating thousands (late 20th century onward).', paths: ['M10 120 Q100 10 190 120', 'M60 70 H140 V85 H60 Z', 'M40 40 H70 V58 H40 Z M130 40 H160 V58 H130 Z', 'M30 110 Q100 60 170 110'] },
  'rock-hewn': { label: 'Rock-hewn church', caption: 'Monolithic churches carved downward into rock, as at Lalibela, Ethiopia (12th–13th c.) or Cappadocia.', paths: ['M10 30 H190', 'M50 30 V120 H150 V30', 'M70 50 H130 V100 H70 Z', 'M100 50 V100 M70 75 H130'] },
};

export function ArchitectureDiagram({ kind }: { kind?: string }) {
  const s = kind ? SHAPES[kind] : undefined;
  if (!s) return null;
  return (
    <figure className="card p-4">
      <svg viewBox="0 0 200 130" className="mx-auto h-40 w-full max-w-xs" role="img" aria-label={`Schematic of a ${s.label}`}>
        {s.paths.map((d, i) => (
          <motion.path key={i} d={d} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: i * 0.25 }} />
        ))}
      </svg>
      <figcaption className="mt-2 text-center text-sm"><b>{s.label}.</b> <span className="text-ink-2">{s.caption}</span></figcaption>
    </figure>
  );
}
