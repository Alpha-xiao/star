/// <reference types="D:/workspace/star/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="D:/workspace/star/node_modules/@vue/language-core/types/props-fallback.d.ts" />
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
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "home-container" },
});
/** @type {__VLS_StyleScopedClasses['home-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "header" },
});
/** @type {__VLS_StyleScopedClasses['header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "title" },
});
/** @type {__VLS_StyleScopedClasses['title']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.vanButton | typeof __VLS_components.VanButton | typeof __VLS_components['van-button'] | typeof __VLS_components.vanButton | typeof __VLS_components.VanButton | typeof __VLS_components['van-button']} */
vanButton;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
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
let __VLS_5;
const __VLS_6 = ({ click: {} },
    { onClick: (__VLS_ctx.onUndo) });
/** @type {__VLS_StyleScopedClasses['undo-btn']} */ ;
const { default: __VLS_7 } = __VLS_3.slots;
// @ts-ignore
[onUndo,];
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid-menu" },
});
/** @type {__VLS_StyleScopedClasses['grid-menu']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showPoopSheet = true;
            // @ts-ignore
            [showPoopSheet,];
        } },
    ...{ class: "menu-item poop" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['poop']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "emoji" },
});
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "label" },
});
/** @type {__VLS_StyleScopedClasses['label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showPeeSheet = true;
            // @ts-ignore
            [showPeeSheet,];
        } },
    ...{ class: "menu-item pee" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['pee']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "emoji" },
});
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "label" },
});
/** @type {__VLS_StyleScopedClasses['label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showBreastDialog = true;
            // @ts-ignore
            [showBreastDialog,];
        } },
    ...{ class: "menu-item breast" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['breast']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "emoji" },
});
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "label" },
});
/** @type {__VLS_StyleScopedClasses['label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showFormulaDialog = true;
            // @ts-ignore
            [showFormulaDialog,];
        } },
    ...{ class: "menu-item formula" },
});
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['formula']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "emoji" },
});
/** @type {__VLS_StyleScopedClasses['emoji']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "label" },
});
/** @type {__VLS_StyleScopedClasses['label']} */ ;
let __VLS_8;
/** @ts-ignore @type { | typeof __VLS_components.vanActionSheet | typeof __VLS_components.VanActionSheet | typeof __VLS_components['van-action-sheet']} */
vanActionSheet;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
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
let __VLS_13;
const __VLS_14 = ({ select: {} },
    { onSelect: (__VLS_ctx.onPoopSelect) });
var __VLS_11;
var __VLS_12;
let __VLS_15;
/** @ts-ignore @type { | typeof __VLS_components.vanActionSheet | typeof __VLS_components.VanActionSheet | typeof __VLS_components['van-action-sheet']} */
vanActionSheet;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    ...{ 'onSelect': {} },
    show: (__VLS_ctx.showPeeSheet),
    actions: (__VLS_ctx.peeOptions),
    cancelText: "取消",
    closeOnClickAction: true,
    title: "💧 选择尿量/操作",
}));
const __VLS_17 = __VLS_16({
    ...{ 'onSelect': {} },
    show: (__VLS_ctx.showPeeSheet),
    actions: (__VLS_ctx.peeOptions),
    cancelText: "取消",
    closeOnClickAction: true,
    title: "💧 选择尿量/操作",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_20;
const __VLS_21 = ({ select: {} },
    { onSelect: (__VLS_ctx.onPeeSelect) });
var __VLS_18;
var __VLS_19;
let __VLS_22;
/** @ts-ignore @type { | typeof __VLS_components.vanDialog | typeof __VLS_components.VanDialog | typeof __VLS_components['van-dialog'] | typeof __VLS_components.vanDialog | typeof __VLS_components.VanDialog | typeof __VLS_components['van-dialog']} */
vanDialog;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showBreastDialog),
    title: "🤱 母乳喂养",
    showCancelButton: true,
}));
const __VLS_24 = __VLS_23({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showBreastDialog),
    title: "🤱 母乳喂养",
    showCancelButton: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_27;
const __VLS_28 = ({ confirm: {} },
    { onConfirm: (__VLS_ctx.submitBreast) });
const { default: __VLS_29 } = __VLS_25.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dialog-content" },
});
/** @type {__VLS_StyleScopedClasses['dialog-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-item" },
});
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
let __VLS_30;
/** @ts-ignore @type { | typeof __VLS_components.vanRadioGroup | typeof __VLS_components.VanRadioGroup | typeof __VLS_components['van-radio-group'] | typeof __VLS_components.vanRadioGroup | typeof __VLS_components.VanRadioGroup | typeof __VLS_components['van-radio-group']} */
vanRadioGroup;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent1(__VLS_30, new __VLS_30({
    modelValue: (__VLS_ctx.breastSide),
    direction: "horizontal",
}));
const __VLS_32 = __VLS_31({
    modelValue: (__VLS_ctx.breastSide),
    direction: "horizontal",
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
const { default: __VLS_35 } = __VLS_33.slots;
let __VLS_36;
/** @ts-ignore @type { | typeof __VLS_components.vanRadio | typeof __VLS_components.VanRadio | typeof __VLS_components['van-radio'] | typeof __VLS_components.vanRadio | typeof __VLS_components.VanRadio | typeof __VLS_components['van-radio']} */
vanRadio;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent1(__VLS_36, new __VLS_36({
    name: "左侧",
}));
const __VLS_38 = __VLS_37({
    name: "左侧",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
const { default: __VLS_41 } = __VLS_39.slots;
// @ts-ignore
[showPoopSheet, showPeeSheet, showBreastDialog, poopOptions, onPoopSelect, peeOptions, onPeeSelect, submitBreast, breastSide,];
var __VLS_39;
let __VLS_42;
/** @ts-ignore @type { | typeof __VLS_components.vanRadio | typeof __VLS_components.VanRadio | typeof __VLS_components['van-radio'] | typeof __VLS_components.vanRadio | typeof __VLS_components.VanRadio | typeof __VLS_components['van-radio']} */
vanRadio;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent1(__VLS_42, new __VLS_42({
    name: "右侧",
}));
const __VLS_44 = __VLS_43({
    name: "右侧",
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
const { default: __VLS_47 } = __VLS_45.slots;
// @ts-ignore
[];
var __VLS_45;
let __VLS_48;
/** @ts-ignore @type { | typeof __VLS_components.vanRadio | typeof __VLS_components.VanRadio | typeof __VLS_components['van-radio'] | typeof __VLS_components.vanRadio | typeof __VLS_components.VanRadio | typeof __VLS_components['van-radio']} */
vanRadio;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent1(__VLS_48, new __VLS_48({
    name: "双侧",
}));
const __VLS_50 = __VLS_49({
    name: "双侧",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
const { default: __VLS_53 } = __VLS_51.slots;
// @ts-ignore
[];
var __VLS_51;
// @ts-ignore
[];
var __VLS_33;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-item" },
});
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
let __VLS_54;
/** @ts-ignore @type { | typeof __VLS_components.vanStepper | typeof __VLS_components.VanStepper | typeof __VLS_components['van-stepper']} */
vanStepper;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent1(__VLS_54, new __VLS_54({
    modelValue: (__VLS_ctx.breastDuration),
    min: (1),
    max: (60),
}));
const __VLS_56 = __VLS_55({
    modelValue: (__VLS_ctx.breastDuration),
    min: (1),
    max: (60),
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
// @ts-ignore
[breastDuration,];
var __VLS_25;
var __VLS_26;
let __VLS_59;
/** @ts-ignore @type { | typeof __VLS_components.vanDialog | typeof __VLS_components.VanDialog | typeof __VLS_components['van-dialog'] | typeof __VLS_components.vanDialog | typeof __VLS_components.VanDialog | typeof __VLS_components['van-dialog']} */
vanDialog;
// @ts-ignore
const __VLS_60 = __VLS_asFunctionalComponent1(__VLS_59, new __VLS_59({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showFormulaDialog),
    title: "🍼 奶粉喂养",
    showCancelButton: true,
}));
const __VLS_61 = __VLS_60({
    ...{ 'onConfirm': {} },
    show: (__VLS_ctx.showFormulaDialog),
    title: "🍼 奶粉喂养",
    showCancelButton: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_60));
let __VLS_64;
const __VLS_65 = ({ confirm: {} },
    { onConfirm: (__VLS_ctx.submitFormula) });
const { default: __VLS_66 } = __VLS_62.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "dialog-content" },
});
/** @type {__VLS_StyleScopedClasses['dialog-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-item center" },
});
/** @type {__VLS_StyleScopedClasses['form-item']} */ ;
/** @type {__VLS_StyleScopedClasses['center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
let __VLS_67;
/** @ts-ignore @type { | typeof __VLS_components.vanStepper | typeof __VLS_components.VanStepper | typeof __VLS_components['van-stepper']} */
vanStepper;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent1(__VLS_67, new __VLS_67({
    modelValue: (__VLS_ctx.formulaAmount),
    min: (10),
    max: (300),
    step: (10),
    integer: true,
    inputWidth: "60px",
    buttonSize: "32px",
}));
const __VLS_69 = __VLS_68({
    modelValue: (__VLS_ctx.formulaAmount),
    min: (10),
    max: (300),
    step: (10),
    integer: true,
    inputWidth: "60px",
    buttonSize: "32px",
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
// @ts-ignore
[showFormulaDialog, submitFormula, formulaAmount,];
var __VLS_62;
var __VLS_63;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
