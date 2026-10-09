// SVG flags from flag-icons (MIT). Imported one by one so only the flags we use
// end up in the bundle; Vite turns each import into a URL (inlined when small).
import cn from 'flag-icons/flags/4x3/cn.svg'
import jp from 'flag-icons/flags/4x3/jp.svg'
import kr from 'flag-icons/flags/4x3/kr.svg'
import ph from 'flag-icons/flags/4x3/ph.svg'

const FLAGS: Record<string, string> = { cn, jp, kr, ph }

/** The bundled flag for a country code, if we ship one. A new cuisine needs its flag imported above. */
export const flagSrc = (countryCode: string): string | undefined => FLAGS[countryCode]

