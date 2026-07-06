/**
 * 补录表单公用工具
 *
 * 保持无 Vue 依赖，方便被组件、页面、单测复用。
 */

/** 支持的补录类型，与设计文档一致。 */
export type BackfillType = 'formula' | 'breast' | 'urine' | 'stool' | 'sleep';

/** 补录类型对应的展示文案。 */
export const BACKFILL_TYPE_LABELS: Record<BackfillType, string> = {
  formula: '奶粉喂养',
  breast: '母乳喂养',
  urine: '拉尿',
  stool: '拉屎',
  sleep: '睡眠'
};

/**
 * 把补录类型映射为后端接受的中文 event_type。
 * 与首页现有的立即记录写入的 event_type 保持一致。
 */
export function mapBackfillTypeToEvent(type: BackfillType): string {
  return BACKFILL_TYPE_LABELS[type];
}

/** 把 YYYY-MM-DD + HH:mm 拼接为本地时间 Date 对象。 */
function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  if ([year, month, day, hours, minutes].some((value) => Number.isNaN(value))) return null;
  const result = new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}

/**
 * 校验补录时间：
 * - 大于当前时间（保留 60 秒容差）→ 未来时间
 * - 早于宝宝出生日的 00:00（本地时间）→ 早于出生日
 * - 通过时返回空字符串
 */
export function validateBackfillTime(date: string, time: string, babyBirthday?: string | null): string {
  const target = combineDateTime(date, time);
  if (!target) return '请选择合法的日期与时间';

  if (target.getTime() > Date.now() + 60_000) return '补录不能选择未来时间';

  if (babyBirthday) {
    const [birthYear, birthMonth, birthDay] = babyBirthday.slice(0, 10).split('-').map(Number);
    if (birthYear && birthMonth && birthDay) {
      const birthStart = new Date(birthYear, birthMonth - 1, birthDay, 0, 0, 0, 0);
      if (target.getTime() < birthStart.getTime()) return '该时间早于宝宝出生日';
    }
  }

  return '';
}
