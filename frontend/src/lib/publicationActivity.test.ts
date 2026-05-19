import { describe, expect, it } from 'vitest'
import {
  filterPublicationActivity,
  getPublicationActivityMeta,
  summarizePublicationActivity,
  type ActivityLike,
} from './publicationActivity'

const entries: ActivityLike[] = [
  { action: 'UPDATE_PERSON', createdAt: '2026-05-19T08:00:00.000Z', username: 'alice' },
  { action: 'UPDATE_PUB_META', createdAt: '2026-05-19T07:00:00.000Z', username: 'bob' },
  { action: 'CREATE_SHARE_LINK', createdAt: '2026-05-18T07:00:00.000Z', username: 'carol' },
  { action: 'DELETE_PUB', createdAt: '2026-05-17T07:00:00.000Z', username: 'dave' },
]

describe('publicationActivity helpers', () => {
  it('maps actions to user-facing metadata and filter groups', () => {
    expect(getPublicationActivityMeta('UPDATE_PERSON')).toMatchObject({
      label: '编辑人物',
      category: 'person',
      tone: 'info',
    })
    expect(getPublicationActivityMeta('CREATE_SHARE_LINK')).toMatchObject({
      label: '创建分享链接',
      category: 'sharing',
    })
    expect(getPublicationActivityMeta('DELETE_PUB')).toMatchObject({
      label: '删除族谱',
      category: 'danger',
      tone: 'danger',
    })
  })

  it('filters activity entries by category', () => {
    expect(filterPublicationActivity(entries, 'all')).toHaveLength(4)
    expect(filterPublicationActivity(entries, 'person')).toEqual([entries[0]])
    expect(filterPublicationActivity(entries, 'sharing')).toEqual([entries[2]])
    expect(filterPublicationActivity(entries, 'danger')).toEqual([entries[3]])
  })

  it('summarizes latest activity, today count, and total count', () => {
    expect(
      summarizePublicationActivity(entries, new Date('2026-05-19T12:00:00.000Z')),
    ).toEqual({
      totalCount: 4,
      todayCount: 2,
      latestUsername: 'alice',
      latestActionLabel: '编辑人物',
      latestCreatedAt: '2026-05-19T08:00:00.000Z',
    })
  })
})
