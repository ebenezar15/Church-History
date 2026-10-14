import type { SVGProps } from 'react';

/** Simple hand-made SVG icons (no copyrighted artwork). 24×24, stroke-based. */
const PATHS = {
  cross: <path d="M12 3v18M7 8h10" />,
  'chi-rho': (<><path d="M9 3v18M9 3h3.5a3.5 3.5 0 0 1 0 7H9" /><path d="M5 9l10 10M15 9L5 19" /></>),
  'orthodox-cross': <path d="M12 2v20M9 5h6M6.5 9.5h11M8.5 16.5l7-2.5" />,
  'coptic-cross': (<><path d="M12 4v16M4 12h16" /><circle cx="12" cy="12" r="3.5" /><path d="M10 4h4M10 20h4M4 10v4M20 10v4" /></>),
  trinity: (<><circle cx="12" cy="8" r="4.2" /><circle cx="8.3" cy="14.4" r="4.2" /><circle cx="15.7" cy="14.4" r="4.2" /></>),
  scroll: (<><path d="M7 4h11a2 2 0 0 1 0 4h-2v10a2 2 0 0 1-2 2H6a2 2 0 0 1 0-4h2V6a2 2 0 0 0-2-2" /><path d="M11 10h3M11 13h3" /></>),
  dove: <path d="M3 13c3 0 5-1 7-3l2-4c1-1.5 3-2 4.5-1L20 6l-2.5.8c.3 3.2-1.2 7-5.5 8.7L8 20l1-4c-2.5 0-4.5-1-6-3z" />,
  flame: <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.6 2.4-5 .4 1.6 1.2 2.4 2.1 2.6C11 8.5 11 6 12 3z" />,
  crown: <path d="M4 18h16M5 18l-1.5-9 5 4L12 6l3.5 7 5-4L19 18" />,
  book: (<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /><path d="M12 7v6M9.5 9.5h5" /></>),
  chalice: <path d="M6 3h12c0 5-2.5 8-6 8S6 8 6 3zM12 11v6M8 21h8M9.5 17h5" />,
  water: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  hourglass: <path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9" />,
  star: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" />,
  scales: <path d="M12 3v18M7 21h10M4 7h16M6.5 7L3.5 14a3 3 0 0 0 6 0zM17.5 7l-3 7a3 3 0 0 0 6 0z" />,
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>),
  keys: (<><circle cx="7" cy="7" r="3" /><circle cx="17" cy="7" r="3" /><path d="M9 9l8 11M15 9L7 20M14.5 17.5l2 1.5M9.5 17.5l-2 1.5" /></>),
  rose: (<><circle cx="12" cy="12" r="3" /><path d="M12 3c2 2 2 4 0 6-2-2-2-4 0-6zM21 12c-2 2-4 2-6 0 2-2 4-2 6 0zM12 21c-2-2-2-4 0-6 2 2 2 4 0 6zM3 12c2-2 4-2 6 0-2 2-4 2-6 0z" /></>),
  circle: <circle cx="12" cy="12" r="8" />,
  question: (<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" /></>),
  quill: <path d="M20 4C12 4 7 9 5 17l-1 3 3-1c8-2 13-7 13-15zM5 17c3-3 6-6 10-9" />,
  branch: (<><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="8" r="2" /><path d="M6 7v10M18 10c0 4-6 3-12 7" /></>),
  split: <path d="M12 21v-7l-6-6V3M12 14l6-6V3M4 5l2-2 2 2M16 5l2-2 2 2" />,
  lamp: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  palette: (<><path d="M12 3a9 9 0 0 0 0 18c1.2 0 2-.8 2-2 0-.6-.3-1-.6-1.4-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.2-4-7.5-9-7.5z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>),
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  play: <path d="M7 4l13 8-13 8z" />,
  pause: <path d="M7 4h3v16H7zM14 4h3v16h-3z" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  map: <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15" />,
  timeline: <path d="M3 12h18M7 8v8M12 5v14M17 9v6" />,
  tree: <path d="M12 21V11M12 11L6 5M12 11l6-6M6 5V3M18 5V3M12 15l-4-2M12 15l4-2" />,
  people: (<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.8 0 5 2 5 5" /></>),
  quote: <path d="M5 17c0-4 1-8 5-10M14 17c0-4 1-8 5-10M5 17h4v-4H5zM14 17h4v-4h-4z" />,
  sparkles: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />,
  compass: (<><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>),
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
  motion: <path d="M4 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" />,
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  shuffle: <path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.6 4-3.7M14 9.7c1-1.6 2-2.7 3-2.7h4M18 4l3 3-3 3M18 14l3 3-3 3" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
