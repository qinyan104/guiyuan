import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { defaultSettings } from '../data/sampleFamily'
import type { Person, PositionedCard, PublicationSettings } from '../types/family'
import PersonCardSvg from './PersonCardSvg.vue'

const person: Person = {
  id: 'p1',
  name: '朱棣',
  gender: 'male',
}

const card: PositionedCard = {
  personId: 'p1',
  x: 0,
  y: 0,
  width: 96,
  height: 160,
}

describe('PersonCardSvg', () => {
  it('uses compact mode typography settings when cards are hidden', () => {
    const settings: PublicationSettings = {
      ...defaultSettings,
      showCard: false,
      compactNameSize: 30,
      compactNameColor: '#224466',
      compactLineColor: '#AA7733',
    }

    const wrapper = mount(PersonCardSvg, {
      props: {
        person,
        card,
        settings,
        selected: false,
      },
    })

    expect(wrapper.get('.person-card__drop-line').attributes('stroke')).toBe('#AA7733')

    const nameStyle = wrapper.get('.person-card__name--compact').attributes('style')
    expect(nameStyle).toContain('font-size: 30px;')
    expect(nameStyle).toContain('fill: rgb(34, 68, 102);')
  })
})
