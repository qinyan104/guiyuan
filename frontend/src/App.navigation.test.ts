import { afterEach, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import PublicationLayout from './views/PublicationLayout.vue'
import WorkbenchView from './views/WorkbenchView.vue'
import { defaultSettings } from './data/sampleFamily'

enableAutoUnmount(afterEach)

vi.mock('./api/authSession', () => ({ bootstrapAuthSession: vi.fn(async () => true) }))
vi.mock('./api/tokenStore', () => ({ getAccessToken: () => 'test-token', getUsername: () => null }))
vi.mock('./api/auth', () => ({ getUsername: () => '测试用户', getRole: () => 'USER' }))
vi.mock('./api/publication', () => ({
  getPublication: vi.fn(async (id: number) => ({
    id,
    revision: 1,
    publication: { title: '测试族谱', subtitle: '', people: {}, families: {}, focusFamilyId: '' },
    settings: defaultSettings,
  })),
  updatePublication: vi.fn(),
}))

it('renders the list after clicking the canvas title, including a second round trip', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/publication/:id',
        component: PublicationLayout,
        children: [{ path: '', name: 'workbench', component: WorkbenchView, props: { publicationId: 7 } }],
      },
      {
        path: '/dashboard',
        component: { template: '<main><router-view /></main>' },
        children: [{ path: 'publications', name: 'publications', component: { template: '<h1>族谱列表</h1>' } }],
      },
    ],
  })
  await router.push('/publication/7')
  await router.isReady()
  const wrapper = mount(App, {
    global: {
      config: { warnHandler: (message) => console.warn(message) },
      plugins: [router],
      stubs: {
        // Keep Vue's actual transition: the default test stub hides the blank-page regression.
        transition: false,
        CommandKPalette: true,
        ToastHost: true,
        BaseDialog: true,
        PublicationCanvas: true,
        WorkbenchPanels: true,
        PersonEditorDrawer: true,
      },
    },
  })
  for (let round = 0; round < 2; round++) {
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('.topbar-title').exists()).toBe(true))
    await wrapper.get('.topbar-title').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('publications')
    await vi.waitFor(() => expect(wrapper.text()).toContain('族谱列表'))
    expect(wrapper.find('.topbar-title').exists()).toBe(false)
    if (round === 0) await router.push('/publication/7')
  }
})
