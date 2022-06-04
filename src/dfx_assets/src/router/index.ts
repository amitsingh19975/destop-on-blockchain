import {
    createRouter,
    createWebHashHistory,
    createWebHistory,
} from 'vue-router';
import useLoader from '../stores/loader';
import routes from './routes';

const createHistory = process.env.VUE_ROUTER_MODE === 'history'
    ? createWebHistory
    : createWebHashHistory;

const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
});

Router.beforeEach((to) => {
    if (to.name === 'NotFoundView') {
        useLoader().loaded();
    } else {
        useLoader().$reset();
    }
});

export default Router;
