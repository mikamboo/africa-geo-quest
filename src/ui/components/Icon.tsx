const PATHS = {
  soundOn: 'M4 9v6h4l5 4V5L8 9H4Zm12.5-1a5 5 0 0 1 0 8M19 5.5a9 9 0 0 1 0 13',
  soundOff: 'M4 9v6h4l5 4V5L8 9H4Zm12 .5 5 5m0-5-5 5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  fast: 'M5 6l6 6-6 6M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 5l7 7-7 7',
  back: 'M15 5l-7 7 7 7',
  idea: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.6.5.8 1.2.8 1.9V16h6v-.5c0-.7.2-1.4.8-1.9A6 6 0 0 0 12 3Z',
} as const;

export type IconName = keyof typeof PATHS;

/** Icônes dessinées en code : nettes partout, contrairement aux emojis qui varient selon l'appareil. */
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
