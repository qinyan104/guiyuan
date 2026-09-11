import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  batchDeleteAccounts,
  cleanupOrphanedAccounts,
  deleteAccount,
  deriveAccounts,
  disableAccount,
  enableAccount,
  listAccounts,
  resetAccountPassword,
  type PersonAccountRow,
} from '../../api/account'
import { usePersonAccounts } from './usePersonAccounts'

vi.mock('../../api/account', () => ({
  batchDeleteAccounts: vi.fn(),
  cleanupOrphanedAccounts: vi.fn(),
  deleteAccount: vi.fn(),
  deriveAccounts: vi.fn(),
  disableAccount: vi.fn(),
  enableAccount: vi.fn(),
  listAccounts: vi.fn(),
  resetAccountPassword: vi.fn(),
}))

const showToast = vi.fn()
vi.mock('../../composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

const rows: PersonAccountRow[] = [
  {
    personDbId: 1,
    personName: '李明',
    gender: 'male',
    deceased: false,
    accountStatus: 'active',
    username: 'liming',
  },
  {
    personDbId: 2,
    personName: '李华',
    gender: 'female',
    deceased: false,
    accountStatus: 'disabled',
    username: 'lihua',
  },
  {
    personDbId: 3,
    personName: '先祖',
    gender: 'male',
    deceased: true,
    accountStatus: 'active',
    username: 'ancestor',
  },
]

describe('usePersonAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listAccounts).mockResolvedValue(rows)
    vi.mocked(deriveAccounts).mockResolvedValue([])
    vi.mocked(batchDeleteAccounts).mockResolvedValue(2)
    vi.mocked(resetAccountPassword).mockResolvedValue('new-secret')
    vi.mocked(cleanupOrphanedAccounts).mockResolvedValue(1)
    vi.mocked(deleteAccount).mockResolvedValue()
    vi.mocked(disableAccount).mockResolvedValue()
    vi.mocked(enableAccount).mockResolvedValue()
  })

  it('loads accounts and keeps selection limited to selectable living accounts', async () => {
    const accounts = usePersonAccounts({ publicationId: 7, copyText: vi.fn() })
    accounts.selectedAccountIds.value = new Set([1, 3, 99])

    await accounts.loadAccounts()

    expect(listAccounts).toHaveBeenCalledWith(7)
    expect(accounts.accounts.value).toEqual(rows)
    expect(accounts.aliveAccounts.value).toBe(2)
    expect([...accounts.selectedAccountIds.value]).toEqual([1])

    accounts.toggleSelectAll()
    expect([...accounts.selectedAccountIds.value]).toEqual([1, 2])
    expect(accounts.isAllSelected.value).toBe(true)

    accounts.toggleSelectAccount(rows[0])
    expect([...accounts.selectedAccountIds.value]).toEqual([2])
  })

  it('derives accounts, copies generated credentials, and reloads the list', async () => {
    const copyText = vi.fn()
    vi.mocked(deriveAccounts).mockResolvedValue([
      { personDbId: 1, personName: '李明', username: 'liming', password: 'secret' },
    ])
    const accounts = usePersonAccounts({ publicationId: 7, copyText })

    await accounts.handleDeriveAccounts()

    expect(deriveAccounts).toHaveBeenCalledWith(7)
    expect(copyText).toHaveBeenCalledWith('李明: liming / secret', '已创建 1 个账号，凭证已复制')
    expect(accounts.showDerivedResult.value).toBe(true)
    expect(listAccounts).toHaveBeenCalled()
  })

  it('handles account actions and confirmation state', async () => {
    const accounts = usePersonAccounts({ publicationId: 7, copyText: vi.fn() })

    await accounts.handleToggleAccount(rows[0])
    expect(disableAccount).toHaveBeenCalledWith(7, 1)

    await accounts.handleToggleAccount(rows[1])
    expect(enableAccount).toHaveBeenCalledWith(7, 2)

    accounts.requestResetPassword(rows[0])
    await accounts.confirmResetPassword()
    expect(resetAccountPassword).toHaveBeenCalledWith(7, 1)
    expect(accounts.resetPasswordResult.value).toBe('new-secret')
    expect(accounts.showResetDialog.value).toBe(true)

    await accounts.handleDeleteAccount(rows[0])
    await accounts.confirmDeleteAccount()
    expect(deleteAccount).toHaveBeenCalledWith(7, 1)

    accounts.selectedAccountIds.value = new Set([1, 2])
    await accounts.handleBatchDelete()
    expect(batchDeleteAccounts).toHaveBeenCalledWith(7, [1, 2])
    expect(accounts.selectedAccountIds.value.size).toBe(0)

    await accounts.handleCleanupOrphans()
    expect(cleanupOrphanedAccounts).toHaveBeenCalledWith(7)
  })
})
