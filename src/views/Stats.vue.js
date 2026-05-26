/// <reference types="D:/workspace/star/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="D:/workspace/star/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useRecordStore } from '@/stores/records';
import { computed } from 'vue';
const store = useRecordStore();
// --- 日期显示 ---
const currentDate = computed(() => {
    const now = new Date();
    const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weeks[now.getDay()]}`;
});
// --- 计算总量 ---
const summary = computed(() => {
    const records = store.todayRecords;
    return {
        poopCount: records.filter((r) => r.event_type === '拉屎').length,
        peeCount: records.filter((r) => r.event_type === '拉尿').length,
        breastDuration: records.filter((r) => r.event_type === '母乳喂养').reduce((acc, r) => acc + (r.duration || 0), 0),
        formulaAmount: records.filter((r) => r.event_type === '奶粉喂养').reduce((acc, r) => acc + (r.amount || 0), 0)
    };
});
const goToReport = () => {
    // 假设腾讯文档链接，用户可自行替换
    window.open('https://docs.qq.com/', '_blank');
};
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['summary-value']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stats-container" },
});
/** @type {__VLS_StyleScopedClasses['stats-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header" },
});
/** @type {__VLS_StyleScopedClasses['header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "title" },
});
/** @type {__VLS_StyleScopedClasses['title']} */ ;
(__VLS_ctx.currentDate);
if (__VLS_ctx.store.todayRecords.length === 0) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "empty-state" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "empty-emoji" },
    });
    /** @type {__VLS_StyleScopedClasses['empty-emoji']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-grid" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-grid']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-item formula" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['formula']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-label" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-value" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-value']} */ ;
    (__VLS_ctx.summary.formulaAmount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-item breast" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['breast']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-label" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-value" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-value']} */ ;
    (__VLS_ctx.summary.breastDuration);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-item poop" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['poop']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-label" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-value" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-value']} */ ;
    (__VLS_ctx.summary.poopCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "summary-item pee" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['pee']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-label" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "summary-value" },
    });
    /** @type {__VLS_StyleScopedClasses['summary-value']} */ ;
    (__VLS_ctx.summary.peeCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "footer-btn" },
});
/** @type {__VLS_StyleScopedClasses['footer-btn']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.vanButton | typeof __VLS_components.VanButton | typeof __VLS_components['van-button'] | typeof __VLS_components.vanButton | typeof __VLS_components.VanButton | typeof __VLS_components['van-button']} */
vanButton;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    type: "primary",
    block: true,
    round: true,
    color: "var(--primary-color)",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    type: "primary",
    block: true,
    round: true,
    color: "var(--primary-color)",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ click: {} },
    { onClick: (__VLS_ctx.goToReport) });
const { default: __VLS_7 } = __VLS_3.slots;
// @ts-ignore
[currentDate, store, summary, summary, summary, summary, goToReport,];
var __VLS_3;
var __VLS_4;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
