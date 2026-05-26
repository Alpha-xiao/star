/// <reference types="D:/workspace/star/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="D:/workspace/star/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { ref, onMounted } from 'vue';
import { syncPendingRecords } from '@/utils/api';
const active = ref(0);
onMounted(() => {
    // 页面加载时尝试同步暂存记录
    syncPendingRecords();
    // 监听网络在线状态
    window.addEventListener('online', syncPendingRecords);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-wrapper" },
});
/** @type {__VLS_StyleScopedClasses['app-wrapper']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.routerView | typeof __VLS_components.RouterView | typeof __VLS_components['router-view'] | typeof __VLS_components.routerView | typeof __VLS_components.RouterView | typeof __VLS_components['router-view']} */
routerView;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
{
    const { default: __VLS_5 } = __VLS_3.slots;
    const [{ Component }] = __VLS_vSlot(__VLS_5);
    let __VLS_6;
    /** @ts-ignore @type { | typeof __VLS_components.transition | typeof __VLS_components.Transition | typeof __VLS_components.transition | typeof __VLS_components.Transition} */
    transition;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        name: "fade",
        mode: "out-in",
    }));
    const __VLS_8 = __VLS_7({
        name: "fade",
        mode: "out-in",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    const __VLS_12 = (Component);
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({}));
    const __VLS_14 = __VLS_13({}, ...__VLS_functionalComponentArgsRest(__VLS_13));
    var __VLS_9;
    __VLS_3.slots['' /* empty slot name completion */];
}
var __VLS_3;
let __VLS_17;
/** @ts-ignore @type { | typeof __VLS_components.vanTabbar | typeof __VLS_components.VanTabbar | typeof __VLS_components['van-tabbar'] | typeof __VLS_components.vanTabbar | typeof __VLS_components.VanTabbar | typeof __VLS_components['van-tabbar']} */
vanTabbar;
// @ts-ignore
const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({
    modelValue: (__VLS_ctx.active),
    route: true,
    activeColor: "var(--primary-color)",
}));
const __VLS_19 = __VLS_18({
    modelValue: (__VLS_ctx.active),
    route: true,
    activeColor: "var(--primary-color)",
}, ...__VLS_functionalComponentArgsRest(__VLS_18));
const { default: __VLS_22 } = __VLS_20.slots;
let __VLS_23;
/** @ts-ignore @type { | typeof __VLS_components.vanTabbarItem | typeof __VLS_components.VanTabbarItem | typeof __VLS_components['van-tabbar-item'] | typeof __VLS_components.vanTabbarItem | typeof __VLS_components.VanTabbarItem | typeof __VLS_components['van-tabbar-item']} */
vanTabbarItem;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
    replace: true,
    to: "/",
    icon: "edit",
}));
const __VLS_25 = __VLS_24({
    replace: true,
    to: "/",
    icon: "edit",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
const { default: __VLS_28 } = __VLS_26.slots;
// @ts-ignore
[active,];
var __VLS_26;
let __VLS_29;
/** @ts-ignore @type { | typeof __VLS_components.vanTabbarItem | typeof __VLS_components.VanTabbarItem | typeof __VLS_components['van-tabbar-item'] | typeof __VLS_components.vanTabbarItem | typeof __VLS_components.VanTabbarItem | typeof __VLS_components['van-tabbar-item']} */
vanTabbarItem;
// @ts-ignore
const __VLS_30 = __VLS_asFunctionalComponent1(__VLS_29, new __VLS_29({
    replace: true,
    to: "/stats",
    icon: "chart-trending-o",
}));
const __VLS_31 = __VLS_30({
    replace: true,
    to: "/stats",
    icon: "chart-trending-o",
}, ...__VLS_functionalComponentArgsRest(__VLS_30));
const { default: __VLS_34 } = __VLS_32.slots;
// @ts-ignore
[];
var __VLS_32;
// @ts-ignore
[];
var __VLS_20;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
