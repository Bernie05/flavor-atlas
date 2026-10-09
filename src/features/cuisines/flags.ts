// SVG flags from flag-icons (MIT) for every country on the atlas map. The glob
// gives each one a URL; in the normal build they stay separate files
// (vite.config.ts), so a visitor only downloads the flags on screen.

/** Countries whose capitals the atlas map draws: the ones a cuisine can be added for. */
export const MAP_COUNTRIES = [
  'af', 'bd', 'bn', 'bt', 'cn', 'hk', 'id', 'in', 'jp', 'kg', 'kh', 'kp', 'kr', 'kz', 'la', 'lk',
  'mm', 'mn', 'mo', 'mv', 'my', 'np', 'ph', 'pg', 'pk', 'sg', 'th', 'tj', 'tl', 'tw', 'uz', 'vn',
] as const

const files = import.meta.glob<string>(
  '/node_modules/flag-icons/flags/4x3/{af,bd,bn,bt,cn,hk,id,in,jp,kg,kh,kp,kr,kz,la,lk,mm,mn,mo,mv,my,np,ph,pg,pk,sg,th,tj,tl,tw,uz,vn}.svg',
  { query: '?url', import: 'default', eager: true },
)

const FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(-6, -4), url]),
)

/** The bundled flag for a country code, if it's a country on the map. */
export const flagSrc = (countryCode: string): string | undefined => FLAGS[countryCode]

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** "vn" → "Vietnam", from the browser's own country names. */
export const countryName = (countryCode: string) => regionNames.of(countryCode.toUpperCase()) ?? countryCode
