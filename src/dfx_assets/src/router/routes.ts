import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        name: 'HomeView',
        path: '/',
        component: () => import('../views/HomeView.vue'),
    },
    {
        name: 'NotFoundView',
        path: '/:catchAll(.*)',
        component: () => import('../views/NotFoundView.vue'),
    },
];

export default routes;
