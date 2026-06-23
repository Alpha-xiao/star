/** 血型枚举 */
export type BloodType = 'A' | 'B' | 'AB' | 'O' | 'unknown';

/** 宝宝档案 */
export interface Baby {
  id: string;
  name: string;
  birthday?: string | null; // YYYY-MM-DD
  gender: 'male' | 'female';
  birthWeight?: number; // kg
  birthHeight?: number; // cm
  bloodType?: BloodType;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}
