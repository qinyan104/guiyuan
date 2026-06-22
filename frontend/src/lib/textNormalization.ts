import { createMultibyteEncoder } from '@exodus/bytes/multi-byte.js'

import type { MountPointTarget, Person, PublicationData, PublicationInfo } from '../types/family'

const encodeGbk = createMultibyteEncoder('gbk')
const decodeUtf8 = new TextDecoder('utf-8', { fatal: true })

export function repairUtf8DecodedAsGbk(value: string): string {
  if (!value) return value

  try {
    const repaired = decodeUtf8.decode(encodeGbk(value))
    return repaired === value ? value : repaired
  } catch {
    return value
  }
}

function repairOptionalText(value?: string | null): string | undefined {
  if (typeof value !== 'string') return undefined
  return repairUtf8DecodedAsGbk(value)
}

function normalizeMountPointTarget(target?: MountPointTarget): void {
  if (!target) return

  target.publicationTitle = repairOptionalText(target.publicationTitle)
  target.rootPersonName = repairOptionalText(target.rootPersonName)
}

function normalizePerson(person: Person): void {
  person.name = repairUtf8DecodedAsGbk(person.name)
  person.birth = repairOptionalText(person.birth)
  person.death = repairOptionalText(person.death)
  person.age = repairOptionalText(person.age)
  person.titleName = repairOptionalText(person.titleName)
  person.clan = repairOptionalText(person.clan)
  person.note = repairOptionalText(person.note)
  person.avatarUrl = repairOptionalText(person.avatarUrl)
  normalizeMountPointTarget(person.mountPointTarget)
}

function normalizeInfo(info?: PublicationInfo): void {
  if (!info) return

  info.description = repairOptionalText(info.description)
  info.ancestralOrigin = repairOptionalText(info.ancestralOrigin)
  info.hallName = repairOptionalText(info.hallName)
  info.familyMotto = repairOptionalText(info.familyMotto)
  info.revisionNotes = repairOptionalText(info.revisionNotes)
}

export function normalizePublicationTextInPlace(publication: PublicationData): void {
  publication.title = repairUtf8DecodedAsGbk(publication.title)
  publication.subtitle = repairUtf8DecodedAsGbk(publication.subtitle)
  normalizeInfo(publication.info)

  for (const person of Object.values(publication.people)) {
    normalizePerson(person)
  }
}
