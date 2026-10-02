import { useState } from 'react'
import { photoSrc } from './utils'

/**
 * Whether to show a recipe's photo, and the props for its <img>.
 * A photo that fails to load (moved, offline, blocked by the host) is
 * dropped so the caller can show its fallback. The failed URL is remembered
 * rather than a true/false flag, so a new link is tried again with no reset.
 */
export function usePhoto(imageUrl: string) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return {
    visible: imageUrl !== '' && imageUrl !== failedUrl,
    src: photoSrc(imageUrl),
    onError: () => setFailedUrl(imageUrl),
  }
}
