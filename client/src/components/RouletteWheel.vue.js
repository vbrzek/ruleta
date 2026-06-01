/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, ref, watch } from 'vue';
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
    11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
    22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const SEG_ANGLE = 360 / 37;
const props = defineProps();
const emit = defineEmits();
function getColor(n) {
    if (n === 0)
        return '#27ae60';
    return RED_NUMBERS.has(n) ? '#c0392b' : '#1a1a2e';
}
function polarToCartesian(cx, cy, r, deg) {
    const rad = (deg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function segPath(i) {
    const cx = 200, cy = 200, r = 192;
    const s = polarToCartesian(cx, cy, r, i * SEG_ANGLE);
    const e = polarToCartesian(cx, cy, r, (i + 1) * SEG_ANGLE);
    return `M${cx},${cy} L${s.x},${s.y} A${r},${r} 0 0,1 ${e.x},${e.y} Z`;
}
const segments = computed(() => WHEEL_ORDER.map((num, i) => {
    const midAngle = (i + 0.5) * SEG_ANGLE;
    const { x, y } = polarToCartesian(200, 200, 158, midAngle);
    return {
        num,
        color: getColor(num),
        path: segPath(i),
        labelX: x,
        labelY: y,
        labelAngle: midAngle,
    };
}));
const currentRotation = ref(0);
const isAnimating = ref(false);
const discStyle = ref({});
const ballStyle = ref({});
watch(() => props.spinning, (spinning) => {
    if (!spinning || props.targetNumber === undefined || isAnimating.value)
        return;
    isAnimating.value = true;
    const targetIdx = WHEEL_ORDER.indexOf(props.targetNumber);
    const targetCenter = (targetIdx + 0.5) * SEG_ANGLE;
    // Spin 8 full rotations + land target at top (0°)
    const additionalRotation = ((360 - targetCenter) % 360) + 360 * 8;
    const finalRotation = currentRotation.value + additionalRotation;
    discStyle.value = {
        transform: `rotate(${finalRotation}deg)`,
        transition: 'transform 5s cubic-bezier(0.2, 0.8, 0.3, 1)',
    };
    ballStyle.value = {
        transform: `rotate(${-finalRotation * 1.35}deg)`,
        transition: 'transform 5s cubic-bezier(0.5, 0, 0.6, 1)',
    };
    currentRotation.value = finalRotation % 360;
});
function onTransitionEnd() {
    if (!isAnimating.value)
        return;
    isAnimating.value = false;
    discStyle.value = { transform: `rotate(${currentRotation.value}deg)` };
    ballStyle.value = {};
    emit('spin-complete');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['wheel-disc']} */ ;
/** @type {__VLS_StyleScopedClasses['ball-track']} */ ;
/** @type {__VLS_StyleScopedClasses['is-static']} */ ;
/** @type {__VLS_StyleScopedClasses['marker']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wheel-scene" },
    ...{ class: ({ 'is-static': props.static }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wheel-tilt" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wheel-rim" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onTransitionend: (__VLS_ctx.onTransitionEnd) },
    ...{ class: "wheel-disc" },
    ...{ style: (__VLS_ctx.discStyle) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 400 400",
    xmlns: "http://www.w3.org/2000/svg",
});
for (const [seg] of __VLS_getVForSourceType((__VLS_ctx.segments))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.g, __VLS_intrinsicElements.g)({
        key: (seg.num),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: (seg.path),
        fill: (seg.color),
        stroke: "#1a0a40",
        'stroke-width': "1.5",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.text, __VLS_intrinsicElements.text)({
        x: (seg.labelX),
        y: (seg.labelY),
        'text-anchor': "middle",
        'dominant-baseline': "central",
        fill: "white",
        'font-size': "11",
        'font-weight': "bold",
        transform: (`rotate(${seg.labelAngle}, ${seg.labelX}, ${seg.labelY})`),
    });
    (seg.num);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "200",
    cy: "200",
    r: "32",
    fill: "#3a2570",
    stroke: "#6b4fc4",
    'stroke-width': "3",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
    cx: "200",
    cy: "200",
    r: "20",
    fill: "#5a3a90",
    stroke: "#8b6fd4",
    'stroke-width': "2",
});
for (const [a] of __VLS_getVForSourceType(([0, 60, 120, 180, 240, 300]))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line)({
        key: (a),
        x1: (200 + 20 * Math.cos((a - 90) * Math.PI / 180)),
        y1: (200 + 20 * Math.sin((a - 90) * Math.PI / 180)),
        x2: (200 + 30 * Math.cos((a - 90) * Math.PI / 180)),
        y2: (200 + 30 * Math.sin((a - 90) * Math.PI / 180)),
        stroke: "#8b6fd4",
        'stroke-width': "2",
    });
}
if (!props.static) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ball-track" },
        ...{ style: (__VLS_ctx.ballStyle) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "ball" },
    });
}
if (!props.static) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "marker" },
    });
}
/** @type {__VLS_StyleScopedClasses['wheel-scene']} */ ;
/** @type {__VLS_StyleScopedClasses['wheel-tilt']} */ ;
/** @type {__VLS_StyleScopedClasses['wheel-rim']} */ ;
/** @type {__VLS_StyleScopedClasses['wheel-disc']} */ ;
/** @type {__VLS_StyleScopedClasses['ball-track']} */ ;
/** @type {__VLS_StyleScopedClasses['ball']} */ ;
/** @type {__VLS_StyleScopedClasses['marker']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            segments: segments,
            discStyle: discStyle,
            ballStyle: ballStyle,
            onTransitionEnd: onTransitionEnd,
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
