type Props = {
  name: string;
  size?: number;
  fill?: string;
  className?: string;
};

const PATHS: Record<string, JSX.Element> = {
  search:  <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  user:    <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
  heart:   <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>,
  bag:     <><path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 1 1 6 0"/></>,
  x:       <><path d="M6 6l12 12"/><path d="M18 6l-6 12"/></>,
  arrow:   <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  check:   <path d="m5 13 4 4 10-11"/>,
  feather: <><path d="M20 4 9 15l-3 5 5-3L22 6z"/><path d="M16 8l-9 9"/></>,
  menu:    <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>,
  close:   <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>,
};

export default function Icon({ name, size = 18, fill, className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ fill: fill || "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" }}
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
