// Line icons for the social links that come from the CMS (see utils/cmsLinks.js).
const PATHS = {
  telegram: ["M21.2 3.6 2.8 10.8c-1 .4-1 1.8 0 2.1l4.5 1.4 1.7 5.3c.3.9 1.4 1.1 2 .5l2.5-2.4 4.7 3.5c.8.6 1.9.1 2.1-.8l2.9-13.9c.2-1-.8-1.8-1.9-1.4Z", "m7.3 14.3 9.6-6.6-6 7.6"],
  instagram: ["M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10a4.5 4.5 0 0 1-4.5 4.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5Z", "M16 11.4a4 4 0 1 1-7.9 1.2 4 4 0 0 1 7.9-1.2Z", "M17.5 6.5h.01"],
  facebook: ["M18 2.5h-3a5 5 0 0 0-5 5v3H7v4h3v7h4v-7h3l1-4h-4v-3a1 1 0 0 1 1-1h3Z"],
  linkedin: ["M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z", "M2 9h4v12H2Z", "M4 2.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"],
};

export function SocialIcon({ type, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {(PATHS[type] || PATHS.telegram).map((d) => <path key={d} d={d} />)}
    </svg>
  );
}
