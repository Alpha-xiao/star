import { showToast } from 'vant';
import type { Baby } from '@/types/baby';

/**
 * 前端 API 适配层。
 *
 * 统一处理鉴权 token、401 静默刷新、离线暂存、前后端字段命名转换，
 * 让页面与 Store 继续使用贴近业务展示的中文护理记录模型。
 */
export type FamilyRole = 'admin' | 'member' | 'viewer';
export type FamilyMemberRole = 'owner' | FamilyRole;

/** 前端护理记录结构，保留中文事件名以贴合页面展示与本地缓存。 */
export interface BabyRecord {
  clientId?: string;
  event_type: string;
  timestamp: string;
  duration?: number;
  side?: string;
  amount?: number;
  note?: string;
  endedAt?: string;
  recorder?: { userId: string; nickname?: string | null };
  /** 记录来源：pwa=实时记录，backfill=历史补录 */
  source?: 'web' | 'pwa' | 'backfill';
}

/** 当前用户可访问的宝宝档案，relation 表示当前用户在该宝宝家庭中的角色。 */
export interface AccessibleBaby extends Baby {
  relation: FamilyMemberRole;
}

/** 家庭成员列表项，后端已合并成员关系与用户基础信息。 */
export interface FamilyMember {
  id: string;
  user: { id: string; nickname?: string | null; phone?: string | null; avatarUrl?: string | null };
  role: FamilyMemberRole;
  isOwner: boolean;
  joinedAt: string;
}

/** 家庭邀请码展示模型，用于生成、复制和作废邀请码。 */
export interface InviteCode {
  id?: string;
  code: string;
  expiresAt: string;
  usedCount: number;
  maxUses: number;
  createdBy?: { nickname?: string | null };
}

/** 通过邀请码加入家庭后的返回结果，用于切换当前宝宝和展示成功弹窗。 */
export interface JoinedResult {
  baby: { id: string; name: string; avatarUrl?: string | null; owner?: { nickname?: string | null } };
  role: FamilyRole;
  joinedAt: string;
}

type BackendEventType = 'poop' | 'pee' | 'breastfeeding' | 'formula' | 'sleep';
type BackendSide = 'left' | 'right' | 'both';

interface BackendRecordPayload {
  clientId: string;
  babyId: string;
  userId: string;
  eventType: BackendEventType;
  happenedAt: string;
  endedAt?: string;
  duration?: number;
  side?: BackendSide;
  amount?: number;
  note?: string;
  source: 'web' | 'pwa' | 'backfill';
}

/** 后端返回的护理记录结构，字段命名与 Prisma/API 保持一致。 */
interface BackendRecord {
  id: string;
  clientId: string;
  eventType: BackendEventType;
  happenedAt: string;
  endedAt?: string;
  duration?: number;
  side?: BackendSide;
  amount?: number;
  note?: string;
  recorder?: { userId: string; nickname?: string | null };
  source?: 'web' | 'pwa' | 'backfill';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const DEFAULT_BABY_ID = import.meta.env.VITE_DEFAULT_BABY_ID || '00000000-0000-0000-0000-000000000101';
const ACCESS_TOKEN_KEY = 'babystar_access_token';
const REFRESH_TOKEN_KEY = 'babystar_refresh_token';

export interface AuthUser {
  id: string;
  phone: string;
  nickname?: string | null;
}

/** 登录、注册、刷新 token 成功后的统一响应结构。 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** 读取当前访问令牌，供路由守卫和 store 判断登录态。 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** 读取刷新令牌；访问令牌过期后用它换取新令牌。 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** 登录/注册/刷新成功后统一持久化 token。 */
export function saveAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

/** 清除本地 token，避免失效凭证继续参与鉴权。 */
export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const pendingGetRequests = new Map<string, Promise<Response>>();
let refreshingToken: Promise<boolean> | null = null;

/** 为 GET 请求生成去重键，短时间重复查询复用同一响应，避免快速切页/连点造成并发请求风暴。 */
function getRequestDedupeKey(input: RequestInfo | URL, init: RequestInit) {
  const method = (init.method || 'GET').toUpperCase();
  if (method !== 'GET') return '';
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return `${method}:${url}`;
}

/** 使用 refreshToken 静默刷新 accessToken，失败时清空本地登录态。 */
async function refreshAccessToken() {
  if (refreshingToken) return refreshingToken;

  refreshingToken = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      clearAuthTokens();
      return false;
    }

    const data: AuthResponse = await response.json();
    saveAuthTokens(data.accessToken, data.refreshToken);
    return true;
  })().finally(() => {
    refreshingToken = null;
  });

  return refreshingToken;
}

function cloneResponse(response: Response) {
  return typeof response.clone === 'function' ? response.clone() : response;
}

/**
 * 统一请求封装：自动附加 Bearer Token，并在 401 时尝试刷新后重放一次。
 *
 * GET 请求会在飞行中合并相同 URL，避免按钮连点、路由重复触发造成重复查询。
 */
async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const requestInit = {
    ...init,
    headers,
    credentials: 'include' as RequestCredentials
  };
  const dedupeKey = getRequestDedupeKey(input, requestInit);

  if (dedupeKey) {
    const pending = pendingGetRequests.get(dedupeKey);
    if (pending) return pending.then(cloneResponse);
  }

  const request = fetch(input, requestInit).then(async (response) => {
    // 仅重试一次，避免 refresh 失效时产生无限递归。
    if (response.status === 401 && retry && (await refreshAccessToken())) {
      return apiFetch(input, init, false);
    }
    return response;
  });

  if (!dedupeKey) return request;

  pendingGetRequests.set(dedupeKey, request);
  request.finally(() => {
    setTimeout(() => pendingGetRequests.delete(dedupeKey), 300);
  });
  return request.then(cloneResponse);
}

/** JSON API 封装：补齐 Content-Type，并统一处理无权限提示和错误抛出。 */
async function apiJson<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await apiFetch(input, {
    ...init,
    headers
  });
  if (response.status === 403) {
    showToast({ message: '权限不足，无法执行该操作', type: 'fail' });
  }
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

/** 登录并保存鉴权 token。 */
export async function login(phone: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, password })
  });
  if (!response.ok) throw new Error(await response.text());
  const data: AuthResponse = await response.json();
  saveAuthTokens(data.accessToken, data.refreshToken);
  return data;
}

/** 注册并保存鉴权 token。 */
export async function register(phone: string, password: string, nickname?: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, password, nickname })
  });
  if (!response.ok) throw new Error(await response.text());
  const data: AuthResponse = await response.json();
  saveAuthTokens(data.accessToken, data.refreshToken);
  return data;
}

/** 通知后端退出并清理本地 token。 */
export async function logout() {
  await apiFetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: getRefreshToken() })
  });
  clearAuthTokens();
}

/** 获取当前登录用户信息，用于恢复 Pinia 登录态。 */
export async function getMe(): Promise<AuthUser> {
  const response = await apiFetch(`${API_BASE_URL}/auth/me`);
  if (!response.ok) throw new Error('Get me failed');
  return response.json();
}

/** 检查当前是否有可用 accessToken；缺失时尝试通过 refreshToken 恢复会话。 */
export async function checkAndRefreshAuth() {
  if (getAccessToken()) return true;
  return refreshAccessToken();
}

/** 获取当前宝宝 ID，优先使用显式选择，其次回退到旧版本地档案缓存和默认值。 */
export function getBabyId(): string {
  const currentBabyId = localStorage.getItem('current_baby_id');
  if (currentBabyId) return currentBabyId;

  const saved = localStorage.getItem('baby_profile');
  if (saved) {
    try {
      return JSON.parse(saved).id;
    } catch {
      /* fallback */
    }
  }
  return DEFAULT_BABY_ID;
}

const eventTypeMap: Record<string, BackendRecordPayload['eventType']> = {
  拉屎: 'poop',
  拉尿: 'pee',
  母乳喂养: 'breastfeeding',
  奶粉喂养: 'formula',
  睡眠: 'sleep'
};

const sideMap: Record<string, BackendRecordPayload['side']> = {
  左侧: 'left',
  右侧: 'right',
  双侧: 'both'
};

const backendEventTypeMap: Record<BackendEventType, string> = {
  poop: '拉屎',
  pee: '拉尿',
  breastfeeding: '母乳喂养',
  formula: '奶粉喂养',
  sleep: '睡眠'
};

const backendSideMap: Record<BackendSide, string> = {
  left: '左侧',
  right: '右侧',
  both: '双侧'
};

/** 确保护理记录拥有 clientId，作为离线重试和后端幂等写入的唯一标识。 */
function ensureClientId(record: BabyRecord) {
  if (!record.clientId) record.clientId = crypto.randomUUID();
  return record.clientId;
}

/** 将页面输入的本地时间统一转成 ISO，非法值回退到当前时间。 */
function normalizeTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** 将前端中文记录字段映射为后端 API/数据库字段。 */
function toBackendPayload(record: BabyRecord): BackendRecordPayload {
  const eventType = eventTypeMap[record.event_type];
  if (!eventType) throw new Error(`Unsupported event type: ${record.event_type}`);

  return {
    clientId: ensureClientId(record),
    babyId: getBabyId(),
    userId: '00000000-0000-0000-0000-000000000000',
    eventType,
    happenedAt: normalizeTimestamp(record.timestamp),
    endedAt: eventType === 'sleep' && record.endedAt ? normalizeTimestamp(record.endedAt) : undefined,
    duration: eventType === 'breastfeeding' || eventType === 'sleep' ? record.duration : undefined,
    side: eventType === 'breastfeeding' && record.side ? sideMap[record.side] : undefined,
    amount: eventType === 'formula' ? record.amount : undefined,
    note: eventType === 'poop' || eventType === 'pee' || eventType === 'sleep' ? record.note : undefined,
    // userId 仍保留在前端载荷结构中，实际归属以后端鉴权用户为准。
    source: record.source ?? 'pwa'
  };
}

/**
 * 提交单条护理记录。
 *
 * 网络或服务异常时不阻断用户记录，会把原始前端记录写入
 * localStorage.pending_records，等待后续批量同步。
 */
export async function submitRecord(record: BabyRecord): Promise<boolean> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toBackendPayload(record))
    });
    if (!response.ok) throw new Error('Network response was not ok');
    return true;
  } catch (error) {
    console.error('Submission failed:', error);
    const pending = JSON.parse(localStorage.getItem('pending_records') || '[]');
    pending.push(record);
    localStorage.setItem('pending_records', JSON.stringify(pending));
    showToast({ message: '网络不佳，已暂存本地', type: 'fail' });
    return false;
  }
}

/**
 * 提交单条历史补录记录。
 *
 * 与 submitRecord 共用离线暂存和幂等机制，仅把 source 标记为 backfill，
 * 便于统计和明细页区分补录与实时记录。
 */
export async function submitBackfillRecord(record: BabyRecord): Promise<boolean> {
  record.source = 'backfill';
  return submitRecord(record);
}

/** 按 clientId 更新护理记录，仅提交当前记录类型需要的可编辑字段。 */
export async function updateRecord(record: BabyRecord): Promise<boolean> {
  if (!record.clientId) return false;

  const payload = toBackendPayload(record);
  const response = await apiFetch(`${API_BASE_URL}/records/by-client-id/${record.clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: payload.eventType,
      happenedAt: payload.happenedAt,
      endedAt: payload.endedAt,
      duration: payload.duration,
      side: payload.side,
      amount: payload.amount,
      note: payload.note
    })
  });

  if (response.status === 403) {
    showToast({ message: '权限不足，无法执行该操作', type: 'fail' });
  }

  return response.ok;
}

/**
 * 撤销护理记录。
 *
 * 先从 pending_records 移除未同步记录；已同步记录则请求后端按 clientId 软删除。
 */
export async function undoRecord(record: BabyRecord): Promise<boolean> {
  if (!record.clientId) return false;

  const pending: BabyRecord[] = JSON.parse(localStorage.getItem('pending_records') || '[]');
  localStorage.setItem('pending_records', JSON.stringify(pending.filter((item) => item.clientId !== record.clientId)));

  try {
    const response = await apiFetch(`${API_BASE_URL}/records/by-client-id/${record.clientId}/undo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (response.status === 403) {
      showToast({ message: '权限不足，无法执行该操作', type: 'fail' });
    }
    return response.ok || response.status === 404;
  } catch (error) {
    console.error('Undo record failed:', error);
    return false;
  }
}

/** 批量同步离线暂存记录，仅移除后端确认成功的 clientId。 */
export async function syncPendingRecords() {
  const pending: BabyRecord[] = JSON.parse(localStorage.getItem('pending_records') || '[]');
  if (pending.length === 0) return;

  try {
    const response = await apiFetch(`${API_BASE_URL}/records/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: pending.map(toBackendPayload) })
    });
    if (!response.ok) throw new Error('Network response was not ok');

    const result: { success: string[] } = await response.json();
    const successfulClientIds = new Set(result.success);
    localStorage.setItem(
      'pending_records',
      JSON.stringify(pending.filter((record) => !record.clientId || !successfulClientIds.has(record.clientId)))
    );

    if (result.success.length > 0) {
      showToast({ message: `同步了 ${result.success.length} 条暂存记录`, type: 'success' });
    }
  } catch (error) {
    console.error('Sync pending records failed:', error);
  }
}

/** 单日统计聚合结果，对应后端 /stats/daily 返回值。 */
export interface DailyStats {
  date: string;
  formulaAmount: number;
  breastDuration: number;
  poopCount: number;
  peeCount: number;
  sleepDuration: number;
  sleepCount: number;
}

/** 格式化为 YYYY-MM-DD，避免直接使用 ISO 日期导致跨时区偏移。 */
export function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 格式化为 HH:mm，供补录时间字段与首页快捷按钮共用。 */
export function formatTimeValue(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** 查询某天的后端统计汇总，统计结果不依赖本地缓存。 */
export async function fetchDailyStats(date = formatDateValue(new Date())): Promise<DailyStats> {
  const params = new URLSearchParams({ babyId: getBabyId(), date });
  const response = await apiFetch(`${API_BASE_URL}/stats/daily?${params.toString()}`);
  if (!response.ok) throw new Error('Fetch daily stats failed');
  return response.json();
}

/** 查询某区间内每日的聚合统计，用于历史趋势周/月视图。 */
export async function fetchRangeStats(babyId: string, from: string, to: string): Promise<DailyStats[]> {
  const params = new URLSearchParams({ babyId, from, to });
  const response = await apiFetch(`${API_BASE_URL}/stats/range?${params.toString()}`);
  if (!response.ok) throw new Error('Fetch range stats failed');
  const result: { items: DailyStats[] } = await response.json();
  return result.items;
}

/** 按东八区自然日构造查询区间，保证统计页日期与用户本地选择一致。 */
function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00.000+08:00`);
  const end = new Date(`${date}T23:59:59.999+08:00`);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** 将后端英文枚举和 happenedAt 字段还原为页面使用的中文记录结构。 */
function toBabyRecord(record: BackendRecord): BabyRecord {
  return {
    clientId: record.clientId,
    event_type: backendEventTypeMap[record.eventType],
    timestamp: record.happenedAt,
    endedAt: record.endedAt,
    duration: record.duration,
    side: record.side ? backendSideMap[record.side] : undefined,
    amount: record.amount,
    note: record.note,
    recorder: record.recorder,
    source: record.source
  };
}

/** 查询选中日期的记录明细，并完成前后端字段映射。 */
export async function fetchDailyRecords(date = formatDateValue(new Date())): Promise<BabyRecord[]> {
  const { from, to } = getDateRange(date);
  const params = new URLSearchParams({ babyId: getBabyId(), from, to });
  const response = await apiFetch(`${API_BASE_URL}/records?${params.toString()}`);
  if (!response.ok) throw new Error('Fetch today records failed');
  const result: { items: BackendRecord[] } = await response.json();
  return result.items.map(toBabyRecord);
}

/** 查询最近一条已结束睡眠，用于计算清醒窗口。 */
export async function getLastSleep(babyId = getBabyId()): Promise<BabyRecord | null> {
  const response = await apiFetch(`${API_BASE_URL}/records/last-sleep?${new URLSearchParams({ babyId }).toString()}`);
  if (!response.ok) throw new Error('Fetch last sleep failed');
  const record: BackendRecord | null = await response.json();
  return record ? toBabyRecord(record) : null;
}

/** 查询后端仍处于进行中的睡眠记录，用于跨设备/刷新后恢复计时。 */
export async function getActiveSleep(babyId = getBabyId()): Promise<BabyRecord | null> {
  const response = await apiFetch(`${API_BASE_URL}/records/active-sleep?${new URLSearchParams({ babyId }).toString()}`);
  if (!response.ok) throw new Error('Fetch active sleep failed');
  const record: BackendRecord | null = await response.json();
  return record ? toBabyRecord(record) : null;
}

/** 统一把后端日期时间字段裁剪成页面表单需要的 YYYY-MM-DD。 */
function normalizeBaby<T extends Baby>(baby: T): T {
  return {
    ...baby,
    birthday: baby.birthday ? String(baby.birthday).slice(0, 10) : null
  };
}

/** 创建宝宝档案，并规范化日期字段后返回。 */
export async function createBaby(data: Partial<Baby>): Promise<Baby> {
  const response = await apiFetch(`${API_BASE_URL}/babies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: data.name,
      birthday: data.birthday || null,
      gender: data.gender,
      birthWeight: data.birthWeight,
      birthHeight: data.birthHeight
    })
  });
  if (!response.ok) throw new Error(await response.text());
  return normalizeBaby(await response.json());
}

/** 获取单个宝宝档案。 */
export async function getBaby(id: string): Promise<Baby> {
  const response = await apiFetch(`${API_BASE_URL}/babies/${id}`);
  if (!response.ok) throw new Error('Get baby failed');
  return normalizeBaby(await response.json());
}

/** 更新宝宝档案；权限由后端校验，前端只负责传递变更字段。 */
export async function updateBaby(id: string, data: Partial<Baby>): Promise<Baby> {
  const response = await apiFetch(`${API_BASE_URL}/babies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Update baby failed: ${await response.text()}`);
  return normalizeBaby(await response.json());
}

/** 获取当前用户创建的宝宝列表。 */
export async function getBabies(): Promise<Baby[]> {
  const response = await apiFetch(`${API_BASE_URL}/babies`);
  if (!response.ok) throw new Error('Get babies failed');
  const list: Baby[] = await response.json();
  return list.map(normalizeBaby);
}

/** 获取当前用户可访问的所有宝宝及其家庭角色。 */
export async function apiGetAccessibleBabies(): Promise<{ babies: AccessibleBaby[] }> {
  const response = await apiFetch(`${API_BASE_URL}/babies/accessible`);
  if (!response.ok) throw new Error(`Get accessible babies failed: ${await response.text()}`);
  const result: { babies: AccessibleBaby[] } = await response.json();
  return { babies: result.babies.map(normalizeBaby) };
}

/** 生成当前宝宝的邀请码，仅管理员/创建者可用。 */
export const apiGenerateInviteCode = (babyId: string) =>
  apiJson<InviteCode>(`${API_BASE_URL}/family/invite-code`, {
    method: 'POST',
    body: JSON.stringify({ babyId })
  });

/** 获取当前宝宝仍可使用的邀请码列表。 */
export const apiGetInviteCodes = (babyId: string) =>
  apiJson<{ codes: InviteCode[] }>(`${API_BASE_URL}/family/invite-code?${new URLSearchParams({ babyId }).toString()}`);

/** 作废指定邀请码。 */
export const apiRevokeInviteCode = (code: string) =>
  apiJson<{ message: string }>(`${API_BASE_URL}/family/invite-code/${code}`, { method: 'DELETE' });

/** 使用邀请码加入家庭，并返回加入后的宝宝与角色信息。 */
export const apiJoinByCode = (code: string) =>
  apiJson<JoinedResult>(`${API_BASE_URL}/family/join`, {
    method: 'POST',
    body: JSON.stringify({ code })
  });

/** 获取当前宝宝的家庭成员列表。 */
export const apiGetMembers = (babyId: string) =>
  apiJson<{ members: FamilyMember[] }>(`${API_BASE_URL}/family/members?${new URLSearchParams({ babyId }).toString()}`);

/** 修改家庭成员角色，具体权限由后端再次校验。 */
export const apiChangeRole = (memberId: string, role: FamilyRole) =>
  apiJson<{ message: string }>(`${API_BASE_URL}/family/members/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  });

/** 移除家庭成员。 */
export const apiRemoveMember = (memberId: string) =>
  apiJson<{ message: string }>(`${API_BASE_URL}/family/members/${memberId}`, { method: 'DELETE' });

/** 主动退出某个宝宝的家庭。 */
export const apiLeave = (babyId: string) =>
  apiJson<{ message: string }>(`${API_BASE_URL}/family/leave`, {
    method: 'POST',
    body: JSON.stringify({ babyId })
  });

// ==================== 成长记录相关 API ====================

/** 单条成长记录，用于列表展示和编辑。 */
export interface GrowthRecord {
  id: string;
  clientId: string;
  measuredAt: string;
  weight?: number | null;
  height?: number | null;
  headCircumference?: number | null;
  note?: string | null;
  recorder?: { userId: string; nickname?: string | null };
}

/** 最新成长指标，包含各指标最新值、测量日期和当时的月龄。 */
export interface GrowthLatest {
  latestWeight?: { value: number; measuredAt: string; ageInDays: number } | null;
  latestHeight?: { value: number; measuredAt: string; ageInDays: number } | null;
  latestHead?: { value: number; measuredAt: string; ageInDays: number } | null;
  totalRecords: number;
}

/** 创建成长记录的请求参数。 */
export interface CreateGrowthInput {
  babyId: string;
  clientId: string;
  measuredAt: string;
  weight?: number | null;
  height?: number | null;
  headCircumference?: number | null;
  note?: string | null;
}

/** 更新成长记录的请求参数。 */
export interface UpdateGrowthInput {
  measuredAt?: string;
  weight?: number | null;
  height?: number | null;
  headCircumference?: number | null;
  note?: string | null;
}

/** 将后端返回的成长记录转换为前端格式。 */
function toGrowthRecord(record: any): GrowthRecord {
  return {
    id: record.id,
    clientId: record.clientId,
    measuredAt: record.measuredAt.slice(0, 10),
    weight: record.weight,
    height: record.heightCm,
    headCircumference: record.headCircumference,
    note: record.note,
    recorder: record.user
  };
}

/** 将成长记录接口响应归一化为列表。 */
function normalizeGrowthRecordsResponse(response: unknown): any[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && Array.isArray((response as { records?: unknown }).records)) {
    return (response as { records: any[] }).records;
  }
  return [];
}

/** 获取宝宝的所有成长记录。 */
export const fetchGrowthRecords = (babyId: string): Promise<GrowthRecord[]> =>
  apiJson<unknown>(`${API_BASE_URL}/growth?${new URLSearchParams({ babyId }).toString()}`).then((records) =>
    normalizeGrowthRecordsResponse(records).map(toGrowthRecord)
  );

/** 获取宝宝的最新成长指标。 */
export const fetchGrowthLatest = (babyId: string): Promise<GrowthLatest> =>
  apiJson(`${API_BASE_URL}/growth/latest?${new URLSearchParams({ babyId }).toString()}`);

/** 提交新的成长记录，失败时暂存到本地。 */
export async function submitGrowthRecord(data: CreateGrowthInput): Promise<boolean> {
  try {
    const response = await apiFetch(`${API_BASE_URL}/growth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Submission failed');
    return true;
  } catch (error) {
    console.error('Submit growth record failed:', error);
    const pending = JSON.parse(localStorage.getItem('pending_growth_records') || '[]');
    pending.push(data);
    localStorage.setItem('pending_growth_records', JSON.stringify(pending));
    showToast({ message: '网络不佳，已暂存本地', type: 'fail' });
    return false;
  }
}

/** 更新成长记录。 */
export const updateGrowthRecord = (clientId: string, data: UpdateGrowthInput): Promise<boolean> =>
  apiFetch(`${API_BASE_URL}/growth/by-client-id/${clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then((res) => res.ok);

/** 删除成长记录（软删除）。 */
export const deleteGrowthRecord = (id: string): Promise<boolean> =>
  apiFetch(`${API_BASE_URL}/growth/${id}`, { method: 'DELETE' }).then((res) => res.ok);

/** 同步暂存的成长记录。 */
export async function syncPendingGrowthRecords() {
  const pending: CreateGrowthInput[] = JSON.parse(localStorage.getItem('pending_growth_records') || '[]');
  if (pending.length === 0) return;

  const successful: string[] = [];
  for (const record of pending) {
    try {
      const ok = await submitGrowthRecord(record);
      if (ok) successful.push(record.clientId);
    } catch {
      // 单个失败继续尝试下一个
    }
  }

  if (successful.length > 0) {
    const remaining = pending.filter((r) => !successful.includes(r.clientId));
    localStorage.setItem('pending_growth_records', JSON.stringify(remaining));
    showToast({ message: `同步了 ${successful.length} 条成长记录`, type: 'success' });
  }
}
