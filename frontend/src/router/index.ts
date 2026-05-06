import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getToken, isAdmin } from '../api/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../views/AdminLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
      },
      {
        path: 'publications',
        name: 'publications',
        component: () => import('../views/PublicationListView.vue'),
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('../views/AdminUsersView.vue'),
        meta: { admin: true },
      },
      {
        path: 'admin/logs',
        name: 'admin-logs',
        component: () => import('../views/AuditLogView.vue'),
        meta: { admin: true },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../views/SettingsView.vue'),
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
        path: 'person/:personId',
        name: 'person-detail',
        component: () => import('../views/PersonDetailView.vue'),
        props: (route) => ({
          publicationId: Number(route.params.id),
          personId: route.params.personId as string,
        }),
      },
      {
        path: 'stats',
        name: 'publication-stats',
        component: () => import('../views/PublicationStatsView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'timeline',
        name: 'publication-timeline',
        component: () => import('../views/TimelineView.vue'),
        props: (route) => ({ publicationId: Number(route.params.id) }),
      },
      {
        path: 'print-preview',
        name: 'print-preview',
        component: () => import('../views/PrintPreviewView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const loggedIn = !!getToken()

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
