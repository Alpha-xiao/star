import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

/**
 * 主题类型：
 * - light 亮色主题
 * - dark 暗色主题
 * - auto 跟随系统偏好
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'theme_mode';
const THEME_ATTR = 'data-theme';

/** 读取系统当前是否偏好暗色。 */
const prefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** 从 localStorage 读取主题模式，未设置时兜底为 auto。 */
const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
};

/** 把最终生效的主题写到 <html data-theme=""> 上，供 CSS 变量匹配。 */
const applyTheme = (theme: 'light' | 'dark') => {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute(THEME_ATTR, theme);
};

/**
 * 主题 Store：集中管理主题模式、系统偏好监听和 DOM 属性同步。
 */
export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredMode());
  const systemDark = ref(prefersDark());

  /** 实际生效的主题：auto 时跟随系统偏好。 */
  const resolvedTheme = computed<'light' | 'dark'>(() =>
    mode.value === 'auto' ? (systemDark.value ? 'dark' : 'light') : mode.value
  );

  const isDark = computed(() => resolvedTheme.value === 'dark');

  /** 切换到指定模式并持久化。 */
  const setMode = (next: ThemeMode) => {
    mode.value = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  /** 在亮暗之间快速切换；当前为 auto 时按当前生效值取反。 */
  const toggle = () => {
    setMode(resolvedTheme.value === 'dark' ? 'light' : 'dark');
  };

  /** 初始化：应用一次主题并监听系统偏好变化。 */
  const init = () => {
    applyTheme(resolvedTheme.value);
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      systemDark.value = e.matches;
    };
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
    } else {
      // Safari 旧版兜底
      media.addListener(onChange);
    }
  };

  watch(resolvedTheme, (theme) => applyTheme(theme), { immediate: false });

  return { mode, systemDark, resolvedTheme, isDark, setMode, toggle, init };
});
