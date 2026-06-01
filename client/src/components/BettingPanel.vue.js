/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, watch } from 'vue';
const BET_TYPES = [
    { value: 'red', label: 'Červená', odds: '1:1' },
    { value: 'black', label: 'Černá', odds: '1:1' },
    { value: 'even', label: 'Sudá', odds: '1:1' },
    { value: 'odd', label: 'Lichá', odds: '1:1' },
    { value: 'number', label: 'Číslo', odds: '35:1' },
];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const props = defineProps();
const emit = defineEmits();
const selectedType = ref('red');
const selectedNumber = ref(0);
const betAmount = ref(100);
const confirmed = ref(false);
function selectType(type) {
    selectedType.value = type;
}
function adjustAmount(delta) {
    const next = betAmount.value + delta;
    if (next >= 100 && next <= props.balance)
        betAmount.value = next;
}
function getNumberClass(n) {
    if (n === 0)
        return 'zero';
    return RED_NUMBERS.has(n) ? 'red' : 'black';
}
const isValid = computed(() => {
    if (betAmount.value < 100 || betAmount.value > props.balance)
        return false;
    if (betAmount.value % 100 !== 0 && betAmount.value !== props.balance)
        return false;
    if (selectedType.value === 'number' && selectedNumber.value === undefined)
        return false;
    return true;
});
function confirmBet() {
    if (!isValid.value)
        return;
    confirmed.value = true;
    emit('confirm-bet', {
        type: selectedType.value,
        amount: betAmount.value,
        ...(selectedType.value === 'number' ? { number: selectedNumber.value } : {}),
    });
}
// Reset when new betting round starts (disabled goes false)
watch(() => props.disabled, (d) => {
    if (!d)
        confirmed.value = false;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['betting-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['num-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['num-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['num-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['num-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "betting-panel" },
    ...{ class: ({ disabled: props.disabled }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "bet-types" },
});
for (const [bt] of __VLS_getVForSourceType((__VLS_ctx.BET_TYPES))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectType(bt.value);
            } },
        key: (bt.value),
        ...{ class: "bet-type-btn" },
        ...{ class: ([`type-${bt.value}`, { active: __VLS_ctx.selectedType === bt.value }]) },
        disabled: (props.disabled),
    });
    (bt.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "odds" },
    });
    (bt.odds);
}
if (__VLS_ctx.selectedType === 'number') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "number-grid" },
    });
    for (const [n] of __VLS_getVForSourceType((37))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.selectedType === 'number'))
                        return;
                    __VLS_ctx.selectedNumber = n - 1;
                } },
            key: (n - 1),
            ...{ class: "num-btn" },
            ...{ class: (__VLS_ctx.getNumberClass(n - 1)) },
            disabled: (props.disabled),
            'aria-pressed': (__VLS_ctx.selectedNumber === n - 1),
        });
        (n - 1);
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "amount-controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.adjustAmount(-100);
        } },
    ...{ class: "amount-btn" },
    disabled: (props.disabled || __VLS_ctx.betAmount <= 100),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "amount-display" },
});
(__VLS_ctx.betAmount.toLocaleString());
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.adjustAmount(100);
        } },
    ...{ class: "amount-btn" },
    disabled: (props.disabled || __VLS_ctx.betAmount >= props.balance),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.betAmount = props.balance;
        } },
    ...{ class: "all-in-btn" },
    disabled: (props.disabled),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.confirmBet) },
    ...{ class: "confirm-btn btn-primary" },
    disabled: (props.disabled || !__VLS_ctx.isValid || __VLS_ctx.confirmed),
});
(__VLS_ctx.confirmed ? 'Čekáme na ostatní...' : 'Vsadit');
/** @type {__VLS_StyleScopedClasses['betting-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-types']} */ ;
/** @type {__VLS_StyleScopedClasses['bet-type-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['odds']} */ ;
/** @type {__VLS_StyleScopedClasses['number-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['num-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['amount-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['amount-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['amount-display']} */ ;
/** @type {__VLS_StyleScopedClasses['amount-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['all-in-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['confirm-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BET_TYPES: BET_TYPES,
            selectedType: selectedType,
            selectedNumber: selectedNumber,
            betAmount: betAmount,
            confirmed: confirmed,
            selectType: selectType,
            adjustAmount: adjustAmount,
            getNumberClass: getNumberClass,
            isValid: isValid,
            confirmBet: confirmBet,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
