import type { Person } from '../types/family'

type PersonStatusShape = Pick<Person, 'age' | 'death' | 'deceased'>

export function isPersonDeceased(person: Pick<PersonStatusShape, 'death' | 'deceased'>): boolean {
  return Boolean(person.deceased || person.death)
}

export function hasPersonLifeRecord(person: PersonStatusShape): boolean {
  return Boolean(person.death || person.age || person.deceased)
}

export function getPersonStatusLabel(person: Pick<PersonStatusShape, 'death' | 'deceased'>): '已故' | '在世' {
  return isPersonDeceased(person) ? '已故' : '在世'
}
