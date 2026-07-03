/** 宝宝血型取值；unknown 表示暂不确定或未填写。 */
export type BloodType = 'A' | 'B' | 'AB' | 'O' | 'unknown';

/**
 * 宝宝档案领域模型。
 *
 * birthday 在前端统一使用 YYYY-MM-DD 字符串，避免 Date/ISO 在跨时区展示时偏移。
 */
export interface Baby {
  id: string;
  name: string;
  /** 前端表单统一读写 YYYY-MM-DD；接口层负责裁剪后端时间字符串。 */
  birthday?: string | null;
  gender: 'male' | 'female';
  /** 出生体重，单位 kg。 */
  birthWeight?: number;
  /** 出生身高，单位 cm。 */
  birthHeight?: number;
  bloodType?: BloodType;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
