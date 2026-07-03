import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { installButtonDebounce } from './utils/button-debounce';
import './style.css';

// 应用入口：注册 Pinia 和路由，业务初始化逻辑集中在 Store、路由守卫和 App.vue 中。
// 通过 unplugin-vue-components 自动注册 Vant 组件，但 Toast / Dialog 等
// 函数式组件需要确保样式被加载，这里手动引入完整的 Vant 样式表
import 'vant/lib/index.css';

const app = createApp(App);
const pinia = createPinia();

// 全局兜底按钮防抖，减少连点导致的重复提交。
installButtonDebounce();

// 按 Vue 插件依赖顺序注册：先状态容器，再挂载依赖 Store 的路由守卫。
app.use(pinia);
app.use(router);

app.mount('#app');
