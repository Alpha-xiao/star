/** WHO 标准百分位数据 */
export interface WHOStandard {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

/** 发育评估结果 */
export interface GrowthAssessment {
  percentile: string;
  status: 'normal' | 'low' | 'high';
}
