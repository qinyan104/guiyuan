import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import { PUBLICATION_CONTEXT_KEY } from '../../types/family'
import GedcomImportDialog from './GedcomImportDialog.vue'
import { mergeGedcom } from './gedcom'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('./gedcom', () => ({ importGedcom: vi.fn(), mergeGedcom: vi.fn() }))

afterEach(() => vi.clearAllMocks())

it.each([false, true])('merges only after local edits have been saved: %s', async saved => {
  const syncStatus = ref('pending')
  const saveToServer = vi.fn(async () => {
    if (saved) syncStatus.value = 'saved'
  })
  const reloadFromServer = vi.fn(async () => undefined)
  vi.mocked(mergeGedcom).mockResolvedValue({ pubId: 7, newPersons: 3, newFamilies: 1, warnings: [] })
  const wrapper = mount(GedcomImportDialog, {
    props: { visible: true, currentPubId: 7 },
    global: {
      provide: { [PUBLICATION_CONTEXT_KEY as symbol]: { syncStatus, saveToServer, reloadFromServer } },
      stubs: { Teleport: true },
    },
  })

  try {
    const input = wrapper.get('input[type="file"]')
    const file = new File(['0 HEAD\n0 TRLR\n'], 'family.ged')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await wrapper.get('input[value="merge"]').setValue()
    await wrapper.get('.import-btn').trigger('click')
    await flushPromises()

    expect(saveToServer).toHaveBeenCalledOnce()
    if (saved) {
      expect(mergeGedcom).toHaveBeenCalledWith(7, file)
      expect(reloadFromServer).toHaveBeenCalledOnce()
      expect(wrapper.text()).toContain('导入成功')
    } else {
      expect(mergeGedcom).not.toHaveBeenCalled()
      expect(reloadFromServer).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('当前修改尚未保存')
    }
  } finally {
    wrapper.unmount()
  }
})
