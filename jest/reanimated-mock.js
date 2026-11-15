// Lightweight Reanimated mock for component tests: animations resolve instantly to their target.
const React = require('react');
const RN = require('react-native');

const identity = (v) => v;
const builder = () => {
  const b = new Proxy(function () {}, { get: (_t, p) => (p === 'build' ? () => undefined : () => b), apply: () => b });
  return b;
};
const createAnimatedComponent = (C) => React.forwardRef((props, ref) => React.createElement(C, { ...props, entering: undefined, exiting: undefined, ref }));
const Animated = {
  View: createAnimatedComponent(RN.View),
  Text: createAnimatedComponent(RN.Text),
  ScrollView: createAnimatedComponent(RN.ScrollView),
  Image: createAnimatedComponent(RN.Image),
  createAnimatedComponent,
};
const interpolate = (x, input, output) => {
  const [i0, i1] = input, [o0, o1] = output;
  if (i1 === i0) return o0;
  return o0 + ((x - i0) / (i1 - i0)) * (o1 - o0);
};
const Easing = new Proxy({}, { get: () => (...args) => (args.length && typeof args[0] === 'function' ? args[0] : identity) });
module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue: (v) => {
    const ref = React.useRef(null);
    if (!ref.current) {
      const sv = { value: v, get: () => sv.value, set: (x) => { sv.value = typeof x === 'function' ? x(sv.value) : x; } };
      ref.current = sv;
    }
    return ref.current;
  },
  useAnimatedStyle: (fn) => fn(),
  useAnimatedProps: (fn) => fn(),
  useDerivedValue: (fn) => ({ value: fn() }),
  useReducedMotion: () => false,
  withTiming: (v, _c, cb) => (cb && cb(true), v),
  withSpring: (v, _c, cb) => (cb && cb(true), v),
  withDelay: (_d, v) => v,
  withSequence: (...vs) => vs[vs.length - 1],
  withRepeat: (v) => v,
  cancelAnimation: () => undefined,
  runOnJS: (fn) => fn,
  interpolate,
  Easing,
  FadeIn: builder(), FadeOut: builder(), FadeInDown: builder(), FadeInUp: builder(), FadeOutUp: builder(),
  FadeInLeft: builder(), FadeInRight: builder(), ZoomIn: builder(),
};
