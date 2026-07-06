/**
 * 埋点入口
 *
 * 目前只输出到 console.debug，方便未来接入真实上报（如埋点 SDK 或 fetch 到 /events）。
 * 保持默认导出小巧，避免打包体积因为埋点无谓膨胀。
 */

/** 补录相关埋点事件类型 */
export type BackfillTrackEvent = 'open' | 'submit' | 'cancel' | 'fail';

/**
 * 上报补录相关埋点。
 *
 * @param event   事件名，open/submit/cancel/fail
 * @param payload 事件属性，如补录类型、来源入口、失败原因等
 */
export function trackBackfill(event: BackfillTrackEvent, payload: Record<string, unknown> = {}) {
  // 默认实现仅打印，未来可接入正式埋点上报
  console.debug('[analytics] backfill_' + event, payload);
}
