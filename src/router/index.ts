import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Stats from '@/views/Stats.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/stats',
      name: 'stats',
      component: Stats,
    },
  ],
});

export default router;
