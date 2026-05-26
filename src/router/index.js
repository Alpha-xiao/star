import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Stats from '@/views/Stats.vue';
const router = createRouter({
    history: createWebHistory(),
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
