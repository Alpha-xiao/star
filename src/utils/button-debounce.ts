/**
 * 全局按钮点击防抖。
 *
 * 对所有 button 的 click 做轻量拦截：一次点击后短时间内再次点击会被阻止，
 * 用来兜底防止用户连点导致重复提交。需要允许连点的按钮可添加 data-no-debounce。
 */
export function installButtonDebounce(delay = 600) {
  let lastClickAt = 0;
  let lastTarget: EventTarget | null = null;

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!target || target.hasAttribute('data-no-debounce')) return;

      const now = Date.now();
      if (target === lastTarget && now - lastClickAt < delay) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      lastTarget = target;
      lastClickAt = now;
    },
    true
  );
}
