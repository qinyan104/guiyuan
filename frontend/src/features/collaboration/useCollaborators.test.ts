import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addAccessRecord,
  listAccessRecords,
  removeAccessRecord,
  searchUsers,
  updateAccessRole,
  type AccessRecord,
} from '../../api/accessManage'
import { useCollaborators } from './useCollaborators'

vi.mock('../../api/accessManage', () => ({
  addAccessRecord: vi.fn(),
  listAccessRecords: vi.fn(),
  removeAccessRecord: vi.fn(),
  searchUsers: vi.fn(),
  updateAccessRole: vi.fn(),
}))

const showToast = vi.fn()
vi.mock('../../composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

const records: AccessRecord[] = [
  {
    id: 1,
    userId: 10,
    username: 'owner',
    nickname: 'Owner',
    role: 'OWNER',
    createdAt: '2026-05-10T12:00:00Z',
  },
  {
    id: 2,
    userId: 11,
    username: 'editor',
    nickname: 'Editor',
    role: 'EDITOR',
    createdAt: '2026-05-10T12:00:00Z',
  },
]

describe('useCollaborators', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.mocked(listAccessRecords).mockResolvedValue(records)
    vi.mocked(searchUsers).mockResolvedValue([
      { id: 11, username: 'editor', nickname: 'Editor' },
      { id: 12, username: 'viewer', nickname: 'Viewer' },
    ])
    vi.mocked(addAccessRecord).mockResolvedValue({ id: 3 })
    vi.mocked(updateAccessRole).mockResolvedValue()
    vi.mocked(removeAccessRecord).mockResolvedValue()
  })

  it('loads collaborators and searches only users that are not already collaborators', async () => {
    vi.useFakeTimers()
    const collaborators = useCollaborators(7)

    await collaborators.load()
    expect(collaborators.records.value).toEqual(records)

    collaborators.searchQuery.value = 'view'
    collaborators.handleSearchInput()
    await vi.runAllTimersAsync()

    expect(searchUsers).toHaveBeenCalledWith('view', expect.any(AbortSignal))
    expect(collaborators.searchResults.value).toEqual([
      { id: 12, username: 'viewer', nickname: 'Viewer' },
    ])

    vi.useRealTimers()
  })

  it('adds selected users and prepares viewer redaction profile', async () => {
    const collaborators = useCollaborators(7)
    collaborators.selectUser({ id: 12, username: 'viewer', nickname: 'Viewer' })
    collaborators.newRole.value = 'VIEWER'

    await collaborators.handleAdd()

    expect(addAccessRecord).toHaveBeenCalledWith(
      7,
      12,
      'VIEWER',
      '{"dates":"LIVING","note":"LIVING","photo":"LIVING"}',
    )
    expect(collaborators.selectedUser.value).toBeNull()
    expect(listAccessRecords).toHaveBeenCalledWith(7)
  })

  it('confirms role changes, privacy updates and removals', async () => {
    const collaborators = useCollaborators(7)

    collaborators.requestInlineRoleChange(records[1], 'VIEWER')
    await collaborators.confirmRoleChange()
    expect(updateAccessRole).toHaveBeenCalledWith(
      7,
      11,
      'VIEWER',
      '{"dates":"LIVING","note":"LIVING","photo":"LIVING"}',
    )

    await collaborators.handleProfileChange(records[1], 'photo', 'ALL')
    expect(updateAccessRole).toHaveBeenLastCalledWith(
      7,
      11,
      'EDITOR',
      '{"dates":"LIVING","note":"LIVING","photo":"ALL"}',
    )

    collaborators.handleRemove(records[1])
    await collaborators.confirmRemove()
    expect(removeAccessRecord).toHaveBeenCalledWith(7, 11)
  })
})
