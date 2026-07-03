import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Stats from '@/views/Stats.vue';
import Profile from '@/views/profile.vue';
import ProfileCreate from '@/views/profile-create.vue';
import Login from '@/views/login.vue';
import Register from '@/views/register.vue';
import Family from '@/views/family.vue';
import FamilyJoin from '@/views/family-join.vue';
import Growth from '@/views/growth.vue';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';

/**
 * 应用路由表。
 *
 * public meta 表示无需登录即可访问；其余页面统一由全局守卫校验登录态和宝宝档案状态。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/register', name: 'register', component: Register, meta: { public: true } },
    { path: '/', name: 'home', component: Home },
    { path: '/stats', name: 'stats', component: Stats },
    { path: '/profile', name: 'profile', component: Profile },
    { path: '/profile/create', name: 'profileCreate', component: ProfileCreate },
    { path: '/family', name: 'family', component: Family },
    { path: '/family/join', name: 'familyJoin', component: FamilyJoin },
    { path: '/growth', name: 'growth', component: Growth, meta: { requiresAuth: true } }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const babyStore = useBabyStore();

  // 首次进入应用时先恢复鉴权状态，后续守卫才能基于准确登录态判断。
  if (!authStore.isReady) {
    await authStore.checkAuth();
  }

  // 未登录访问受保护页面时跳转登录，并保留原始目标用于登录后回跳。
  if (!authStore.isLoggedIn && !to.meta.public) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // 已登录用户不再进入登录/注册页，避免重复登录覆盖当前会话。
  if (authStore.isLoggedIn && to.meta.public) {
    return { path: '/' };
  }

  // 登录后按需加载可访问宝宝，用于后续建档、家庭权限和 Tab 页面判断。
  if (authStore.isLoggedIn && babyStore.accessibleBabies.length === 0 && to.path !== '/profile/create') {
    await babyStore.loadAccessibleBabies();
  }

  // 没有任何宝宝时强制先建档；加入家庭页例外，允许通过邀请码获得宝宝访问权。
  if (authStore.isLoggedIn && !babyStore.hasAccessibleBaby && !['/profile/create', '/family/join'].includes(to.path)) {
    return { path: '/profile/create' };
  }

  // 已有宝宝时禁止再次进入初始建档页。
  if (authStore.isLoggedIn && babyStore.hasAccessibleBaby && to.path === '/profile/create') {
    return { path: '/' };
  }
});

export default router;
