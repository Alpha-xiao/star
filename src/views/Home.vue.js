/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref } from 'vue';
import { showConfirmDialog, showToast } from 'vant';
import { useRecordStore } from '@/stores/records';
import { submitRecord } from '@/utils/api';
const store = useRecordStore();
// --- 状态控制 ---
const showPoopSheet = ref(false);
const showPeeSheet = ref(false);
const showBreastDialog = ref(false);
const showFormulaDialog = ref(false);
const poopOptions = [
    { name: '黄色糊状', color: '#f39c12' },
    { name: '绿色稀便', color: '#27ae60' },
    { name: '有奶瓣', color: '#d35400' },
    { name: '其他', color: '#7f8c8d' },
];
const peeOptions = [
    { name: '量多' },
    { name: '量少' },
    { name: '换尿布' },
];
// --- 表单数据 ---
const breastSide = ref('左侧');
const breastDuration = ref(15);
const formulaAmount = ref(60);
// --- 通用提交逻辑 ---
const isSubmitting = ref(false);
const handleRecord = async (type, data) => {
    if (isSubmitting.value)
        return;
    isSubmitting.value = true;
    const record = {
        event_type: type,
        timestamp: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        ...data,
    };
    // 先存本地 store
    store.addRecord(record);
    // 异步提交 Webhook
    await submitRecord(record);
    isSubmitting.value = false;
    showToast({ message: '记录成功', type: 'success' });
};
// --- 撤销逻辑 ---
const onUndo = () => {
    showConfirmDialog({
        title: '撤销确认',
        message: '确定要删除上一条记录吗？',
    }).then(() => {
        const removed = store.undoLastRecord();
        if (removed) {
            showToast('已撤销上一条记录');
        }
    }).catch(() => { });
};
// --- 各项功能处理 ---
const onPoopSelect = (item) => {
    handleRecord('拉屎', { note: item.name });
    showPoopSheet.value = false;
};
const onPeeSelect = (item) => {
    handleRecord('拉尿', { note: item.name });
    showPeeSheet.value = false;
};
const submitBreast = () => {
    handleRecord('母乳喂养', { side: breastSide.value, duration: breastDuration.value });
    showBreastDialog.value = false;
};
const submitFormula = () => {
    handleRecord('奶粉喂养', { amount: formulaAmount.value });
    showFormulaDialog.value = false;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "title" },
});
const __VLS_0 = {}.VanButton;
/** @type {[typeof __VLS_components.VanButton, typeof __VLS_components.vanButton, typeof __VLS_components.VanButton, typeof __VLS_components.vanButton, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onClick': {} },
    icon: "replay",
    size: "small",
    round: true,
    ...{ class: "undo-btn" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onClick': {} },
    icon: "replay",
    size: "small",
    round: true,
    ...{ class: "undo-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onClick: (__VLS_ctx.onUndo)
};
__VLS_3.slots.default;
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid-menu" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showPoopSheet = true;
        } },
    ...{ class: "menu-item poop" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "emoji" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showPeeSheet = true;
        } },
    ...{ class: "menu-item pee" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "emoji" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showBreastDialog = true;
        } },
    ...{ class: "menu-item breast" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "emoji" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showFormulaDialog = true;
        } },
    ...{ class: "menu-item formula" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "emoji" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "label" },
});
const __VLS_8 = {}.VanActionSheet;
/** @type {[typeof __VLS_components.VanActionSheet, typeof __VLS_components.vanActionSheet, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    ...{ 'onSelect': {} },
    show: (__VLS_ctx.showPoopSheet),
    actions: (__VLS_ctx.poopOptions),
    cancelText: "取消",
    closeOnClickAction: true,
    title: "💩 选择便便性状",
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSelect': {} },
    show: (__VLS_ctx.showPoopSheet),
    actions: (__VLS_ctx.poopOptions),
    cancelText: "取消",
    closeOnClickAction: true,
    title: "💩 选择便便性状",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onSelect: (__VLS_ctx.onPoopSelect)
};
var __VLS_11;
const __VLS_16 = {}.VanActionSheet;
/** @type {[typeof __VLS_components.VanActionSheet, typeof __VLS_components.vanActionSheet, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onSelect': {} },
    show: (__VLS_ctx.showPeeSheet),
    actions: (__VLS_ctx.peeOptions),
    cancelText: "取消",
    closeOnClickAction: true,
    title: "💧 选择尿量/操作",
}));
const __VLS_18 = __VLS_17({
    ...{ 'onSelect': {} },
    show: (__VLS_ctx.showPeeSheet),
    actions: (__VLS_ctx.peeOptions),
    cancelText: "取消",
    closeOnClickAction: true,
    title: "💧 选择尿量/操作",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onSelect: (__VLS_ctx.onPeeSelect)
};
var __VLS_19;
const __VLS_24 = {}.VanDialog;
/** @type {[typeof __VLS_components.VanDialog, typeof __VLS_components.vanDialog, typeof __VLS_components.VanDialog, typeof __VLS_components.vanDialog, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showBreastDialog),
    title: "🤱 母乳喂养",
    showCancelButton: true,
}));
const __VLS_26 = __VLS_25({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showBreastDialog),
    title: "🤱 母乳喂养",
    showCancelButton: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
let __VLS_28;
let __VLS_29;
let __VLS_30;
const __VLS_31 = {
    onConfirm: (__VLS_ctx.submitBreast)
};
__VLS_27.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dialog-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
const __VLS_32 = {}.VanRadioGroup;
/** @type {[typeof __VLS_components.VanRadioGroup, typeof __VLS_components.vanRadioGroup, typeof __VLS_components.VanRadioGroup, typeof __VLS_components.vanRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    modelValue: (__VLS_ctx.breastSide),
    direction: "horizontal",
}));
const __VLS_34 = __VLS_33({
    modelValue: (__VLS_ctx.breastSide),
    direction: "horizontal",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
const __VLS_36 = {}.VanRadio;
/** @type {[typeof __VLS_components.VanRadio, typeof __VLS_components.vanRadio, typeof __VLS_components.VanRadio, typeof __VLS_components.vanRadio, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    name: "左侧",
}));
const __VLS_38 = __VLS_37({
    name: "左侧",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
__VLS_39.slots.default;
var __VLS_39;
const __VLS_40 = {}.VanRadio;
/** @type {[typeof __VLS_components.VanRadio, typeof __VLS_components.vanRadio, typeof __VLS_components.VanRadio, typeof __VLS_components.vanRadio, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    name: "右侧",
}));
const __VLS_42 = __VLS_41({
    name: "右侧",
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
var __VLS_43;
const __VLS_44 = {}.VanRadio;
/** @type {[typeof __VLS_components.VanRadio, typeof __VLS_components.vanRadio, typeof __VLS_components.VanRadio, typeof __VLS_components.vanRadio, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    name: "双侧",
}));
const __VLS_46 = __VLS_45({
    name: "双侧",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
var __VLS_47;
var __VLS_35;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
const __VLS_48 = {}.VanStepper;
/** @type {[typeof __VLS_components.VanStepper, typeof __VLS_components.vanStepper, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    modelValue: (__VLS_ctx.breastDuration),
    min: (1),
    max: (60),
}));
const __VLS_50 = __VLS_49({
    modelValue: (__VLS_ctx.breastDuration),
    min: (1),
    max: (60),
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_27;
const __VLS_52 = {}.VanDialog;
/** @type {[typeof __VLS_components.VanDialog, typeof __VLS_components.vanDialog, typeof __VLS_components.VanDialog, typeof __VLS_components.vanDialog, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showFormulaDialog),
    title: "🍼 奶粉喂养",
    showCancelButton: true,
}));
const __VLS_54 = __VLS_53({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showFormulaDialog),
    title: "🍼 奶粉喂养",
    showCancelButton: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
let __VLS_56;
let __VLS_57;
let __VLS_58;
const __VLS_59 = {
    onConfirm: (__VLS_ctx.submitFormula)
};
__VLS_55.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dialog-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-item center" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
const __VLS_60 = {}.VanStepper;
/** @type {[typeof __VLS_components.VanStepper, typeof __VLS_components.vanStepper, ]} */ ;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
    modelValue: (__VLS_ctx.formulaAmount),
    min: (10),
    max: (300),
    step: (10),
    integer: true,
    inputWidth: "60px",
    buttonSize: "32px",
}));
const __VLS_62 = __VLS_61({
    modelValue: (__VLS_ctx.formulaAmount),
    min: (10),
    max: (300),
    step: (10),
    integer: true,
    inputWidth: "60px",
    buttonSize: "32px",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
var __VLS_55;
/** @type {__VLS_StyleScopedClasses['home-container']} */ ;
/** @type {__VLS_StyleScopedClasses['header']} */ ;
/** @type {__VLS_StyleScopedClasses['title']} */ ;
/** @type {__VLS_StyleScopedClasses['undo-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['grid-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['poop']} */ ;
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pee']} */ ;
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['breast']} */ ;
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['formula']} */ ;
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-content']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dialog-content']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['center']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            showPoopSheet: showPoopSheet,
            showPeeSheet: showPeeSheet,
            showBreastDialog: showBreastDialog,
            showFormulaDialog: showFormulaDialog,
            poopOptions: poopOptions,
            peeOptions: peeOptions,
            breastSide: breastSide,
            breastDuration: breastDuration,
            formulaAmount: formulaAmount,
            onUndo: onUndo,
            onPoopSelect: onPoopSelect,
            onPeeSelect: onPeeSelect,
            submitBreast: submitBreast,
            submitFormula: submitFormula,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
