// SVG flags from flag-icons (MIT). Imported one by one so only the flags we use
// end up in the bundle; Vite turns each import into a URL (inlined when small).
import cn from 'flag-icons/flags/4x3/cn.svg'
import jp from 'flag-icons/flags/4x3/jp.svg'
import kr from 'flag-icons/flags/4x3/kr.svg'
import ph from 'flag-icons/flags/4x3/ph.svg'

const FLAGS: Record<string, string> = { cn, jp, kr, ph }

const SIZES = {
  sm: 'h-3 w-4 rounded-[2px]',
  md: 'h-5 w-[1.666rem] rounded-[3px]',
  lg: 'h-7 w-[2.333rem] rounded',
} as const

interface CuisineFlagProps {
  /** ISO 3166-1 alpha-2, lowercase: "ph". */
  countryCode: string
  size?: keyof typeof SIZES
  className?: string
}

/**
 * A country's flag as an image, not an emoji: flag emoji show up as two
 * letters on Windows. Decorative, since the cuisine name is always next to it.
 * Renders nothing for a country we don't ship a flag for.
 */
export function CuisineFlag({ countryCode, size = 'md', className = '' }: CuisineFlagProps) {
  const src = FLAGS[countryCode]
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      className={`inline-block shrink-0 object-cover shadow-sm ring-1 ring-black/15 ${SIZES[size]} ${className}`}
    />
  )
}
