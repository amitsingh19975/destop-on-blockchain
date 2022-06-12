// import { dfx } from "../../declarations/dfx";
import { Quasar } from 'quasar';
import { createApp } from 'vue';
import Router from './router';
import QuasarPlugin from './plugins/quasar';
import App from './App.vue';
import vClickOutside from './plugins/v-click-outside';
import '@quasar/extras/ionicons-v4/ionicons-v4.css';
import '@quasar/extras/material-icons/material-icons.css';
import piniaError from './plugins/piniaError';
import { notifyNeg } from './scripts/notify';
import registerWinApp from './windowApp';
import VContextMenu from './plugins/v-context-menu';
import 'video.js/dist/video-js.css';
import pinia from './stores';

const app = createApp(App);
app.use(Quasar, QuasarPlugin);

pinia.use(piniaError(
    {
        callback: (err, sId, action) => {
            let pre: string | undefined;
            // @ts-ignore
            if (process.env.NODE_ENV !== 'production') {
                pre = `Error in store['${sId}'] while executing action['${action}']: `;
            }
            notifyNeg(err, {
                pre,
            });
        },
    },
));

app.use(pinia);
app.use(Router);
app.directive('click-outside', vClickOutside);
app.directive('context-menu', VContextMenu);
registerWinApp(app);

app.mount('#app');

export default app;
