import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

// Vant 组件样式按需引入时，部分全局样式仍需手动或通过插件引入
// 这里我们使用 unplugin-vue-components 处理组件，但 Toast, Dialog 等函数式组件需要手动引入样式
import 'vant/lib/index.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
