import { layoutPublication } from '../lib/layout'
import type { PublicationData, PublicationSettings } from '../types/family'

self.onmessage = (event: MessageEvent<{ publication: PublicationData; settings: PublicationSettings }>) => {
  const { publication, settings } = event.data
  self.postMessage(layoutPublication(publication, settings))
}
