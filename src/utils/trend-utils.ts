import type { DailyStats } from '@/utils/api';

/**
 * 趋势视图辅助工具：CSV 导出与埋点占位。
 *
 * 埋点仅在开发环境打印，后续可替换成真实的埋点上报。
 */

/** 导出每日聚合数据为 CSV，并触发浏览器下载。 */
export function downloadDailyStatsCsv(items: DailyStats[], filename: string) {
  const header = ['日期', '奶粉(ml)', '母乳(min)', '睡眠(min)', '睡眠次数', '拉尿(次)', '拉屎(次)'];
  const rows = items.map((day) => [
    day.date,
    day.formulaAmount || 0,
    day.breastDuration || 0,
    day.sleepDuration || 0,
    day.sleepCount || 0,
    day.peeCount || 0,
    day.poopCount || 0
  ]);

  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
  // 加上 BOM，确保 Excel 打开时中文不乱码。
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** 埋点占位：后续接入真实上报后替换实现。 */
export function trackEvent(event: string, payload: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    console.debug(`[trend-track] ${event}`, payload);
  }
}
