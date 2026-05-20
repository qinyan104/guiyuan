import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getToken, isAdmin } from '../api/auth'
import { bootstrapAuthSession } from '../api/authSession'
import AdminLayout from '../views/AdminLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import PublicationListView from '../views/PublicationListView.vue'
import AdminUsersView from '../views/AdminUsersView.vue'
import AuditLogView from '../views/AuditLogView.vue'
import SettingsView from '../views/SettingsView.vue'
import SamplePreviewView from '../views/SamplePreviewView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/share/:token',
    name: 'share',
    component: () => import('../views/ShareView.vue'),
    meta: { public: true },
  },
  {
    path: '/sample/:sampleId',
    name: 'sample-preview',
    component: SamplePreviewView,
  },
  {
    path: '/',
    component: AdminLayout,
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
      },
      {
        path: 'publications',
        name: 'publications',
        component: PublicationListView,
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: AdminUsersView,
        meta: { admin: true },
      },
      {
        path: 'admin/logs',
        name: 'admin-logs',
        component: AuditLogView,
        meta: { admin: true },
      },
      {
        path: 'settings',
        name: 'settings',
        component: SettingsView,
      },
      {
        path: 'profile/edit',
        name: 'profile-edit',
        component: () => import('../views/ProfileEditView.vue'),
      },
      {
        path: 'admin/publications/:pubId/accounts',
        name: 'admin-accounts',
        component: () => import('../views/AdminAccountsView.vue'),
        props: (route) => ({ pubId: Number(route.params.pubId) }),
        meta: { admin: true },
      },
      {
        path: 'admin/publications/:pubId/reviews',
        name: 'admin-reviews',
        component: () => import('../views/AdminReviewView.vue'),
        props: (route) => ({ pubId: Number(route.params.pubId) }),
        meta: { admin: true },
      },
    ],
  },
  {
    path: '/publication/:id',
    component: () => import('../views/PublicationLayout.vue'),
    children: [
      {
        path: '',
        name: 'workbench',
        component: () => import('../views/WorkbenchView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'stats',
        name: 'publication-stats',
        component: () => import('../views/PublicationStatsView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'activity',
        name: 'publication-activity',
        component: () => import('../views/PublicationActivityView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'timeline',
        name: 'publication-timeline',
        component: () => import('../views/TimelineView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  let loggedIn = !!getToken()

  if (!loggedIn && (!to.meta.public || to.name === 'login')) {
    await bootstrapAuthSession()
    loggedIn = !!getToken()
  }

  if (!loggedIn && !to.meta.public) {
    return { name: 'login' }
  }

  if (loggedIn && to.name === 'login') {
    return { name: 'dashboard' }
  }

  if (to.meta.admin && !isAdmin()) {
    return { name: 'dashboard' }
  }
})

export default router
