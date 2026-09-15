import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import http from '../api/http'

import { defaultSettings } from '../data/sampleFamily'
import { stubObjectUrl } from '../test-utils/objectUrl'
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
  it('显示租用地址，同时保留待导出的原始地址', async () => {
    const get = vi.spyOn(http, 'get').mockResolvedValue({ data: new Blob() })
    const objectUrl = stubObjectUrl(() => 'blob:card')
    const source = { ...person, avatarUrl: '/api/photos/1' }
    const wrapper = mount(PersonCardSvg, {
      props: {
        person: source,
        card,
        settings: { ...defaultSettings, showCard: true, showPhoto: true },
        selected: false,
      },
    })
    try {
      expect(wrapper.get('image').attributes('data-original-photo-url')).toBe('/api/photos/1')
      expect(wrapper.get('image').attributes('href')).toBeUndefined()
      await flushPromises()
      expect(wrapper.get('image').attributes('href')).toBe('blob:card')
      expect(source.avatarUrl).toBe('/api/photos/1')
    } finally {
      wrapper.unmount()
      get.mockRestore()
      objectUrl.restore()
    }
  })

  it('uses the configured card corner radius', () => {
    const wrapper = mount(PersonCardSvg, {
      props: {
        person,
        card,
        settings: { ...defaultSettings, cardRadius: 8 },
        selected: false,
      },
    })

    expect(wrapper.get('.person-card__panel').attributes('rx')).toBe('8')
    expect(wrapper.get('.person-card__panel').attributes('ry')).toBe('8')
  })

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

  it('uses a theme-aware compact name color for the default compact setting', () => {
    const settings: PublicationSettings = {
      ...defaultSettings,
      showCard: false,
    }

    const wrapper = mount(PersonCardSvg, {
      props: {
        person,
        card,
        settings,
        selected: false,
      },
    })

    const nameStyle = wrapper.get('.person-card__name--compact').attributes('style')
    expect(nameStyle).toContain('fill: var(--card-compact-name-fill, var(--card-name-fill, #1D1D1F));')
  })
})
