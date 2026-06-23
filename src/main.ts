import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';

// 通过 unplugin-vue-components 自动注册 Vant 组件，但 Toast / Dialog 等
// 函数式组件需要确保样式被加载，这里手动引入完整的 Vant 样式表
import 'vant/lib/index.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
