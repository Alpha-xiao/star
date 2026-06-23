import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/home.vue';
import Stats from '@/views/stats.vue';
import Profile from '@/views/profile.vue';
import ProfileCreate from '@/views/profile-create.vue';
import Login from '@/views/login.vue';
import Register from '@/views/register.vue';
import { useAuthStore } from '@/stores/auth';
import { useBabyStore } from '@/stores/baby';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/register', name: 'register', component: Register, meta: { public: true } },
    { path: '/', name: 'home', component: Home },
    { path: '/stats', name: 'stats', component: Stats },
    { path: '/profile', name: 'profile', component: Profile },
    { path: '/profile/create', name: 'profileCreate', component: ProfileCreate }
  ]
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  const babyStore = useBabyStore();

  if (!authStore.isReady) {
    await authStore.checkAuth();
  }

  if (!authStore.isLoggedIn && !to.meta.public) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  if (authStore.isLoggedIn && to.meta.public) {
    return { path: '/' };
  }

  if (authStore.isLoggedIn && !babyStore.hasProfile) {
    await babyStore.loadBaby();
  }

  if (authStore.isLoggedIn && !babyStore.hasProfile && to.path !== '/profile/create') {
    return { path: '/profile/create' };
  }

  if (authStore.isLoggedIn && babyStore.hasProfile && to.path === '/profile/create') {
    return { path: '/' };
  }
});

export default router;
