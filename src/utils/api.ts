import { showToast } from 'vant';
import type { Baby } from '@/types/baby';

export interface BabyRecord {
  clientId?: string;
  event_type: string;
  timestamp: string;
  duration?: number;
  side?: string;
  amount?: number;
  note?: string;
}

type BackendEventType = 'poop' | 'pee' | 'breastfeeding' | 'formula';
type BackendSide = 'left' | 'right' | 'both';

interface BackendRecordPayload {
  clientId: string;
  babyId: string;
  userId: string;
  eventType: BackendEventType;
  happenedAt: string;
  duration?: number;
  side?: BackendSide;
  amount?: number;
  note?: string;
  source: 'pwa';
}

interface BackendRecord {
  id: string;
  clientId: string;
  eventType: BackendEventType;
  happenedAt: string;
  duration?: number;
  side?: BackendSide;
  amount?: number;
  note?: string;
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

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveAuthTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken() {
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
}

async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include'
  });

  if (response.status === 401 && retry && (await refreshAccessToken())) {
    return apiFetch(input, init, false);
  }

  return response;
}

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

export async function logout() {
  await apiFetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: getRefreshToken() })
  });
  clearAuthTokens();
}

export async function getMe(): Promise<AuthUser> {
  const response = await apiFetch(`${API_BASE_URL}/auth/me`);
  if (!response.ok) throw new Error('Get me failed');
  return response.json();
}

export async function checkAndRefreshAuth() {
  if (getAccessToken()) return true;
  return refreshAccessToken();
}

export function getBabyId(): string {
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
  奶粉喂养: 'formula'
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
  formula: '奶粉喂养'
};

const backendSideMap: Record<BackendSide, string> = {
  left: '左侧',
  right: '右侧',
  both: '双侧'
};

function ensureClientId(record: BabyRecord) {
  if (!record.clientId) record.clientId = crypto.randomUUID();
  return record.clientId;
}

function normalizeTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function toBackendPayload(record: BabyRecord): BackendRecordPayload {
  const eventType = eventTypeMap[record.event_type];
  if (!eventType) throw new Error(`Unsupported event type: ${record.event_type}`);

  return {
    clientId: ensureClientId(record),
    babyId: getBabyId(),
    userId: '00000000-0000-0000-0000-000000000000',
    eventType,
    happenedAt: normalizeTimestamp(record.timestamp),
    duration: record.duration,
    side: record.side ? sideMap[record.side] : undefined,
    amount: record.amount,
    note: record.note,
    source: 'pwa'
  };
}

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
    return response.ok || response.status === 404;
  } catch (error) {
    console.error('Undo record failed:', error);
    return false;
  }
}

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

export interface DailyStats {
  date: string;
  formulaAmount: number;
  breastDuration: number;
  poopCount: number;
  peeCount: number;
}

export function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function fetchDailyStats(date = formatDateValue(new Date())): Promise<DailyStats> {
  const params = new URLSearchParams({ babyId: getBabyId(), date });
  const response = await apiFetch(`${API_BASE_URL}/stats/daily?${params.toString()}`);
  if (!response.ok) throw new Error('Fetch daily stats failed');
  return response.json();
}

function getDateRange(date: string) {
  const start = new Date(`${date}T00:00:00.000+08:00`);
  const end = new Date(`${date}T23:59:59.999+08:00`);
  return { from: start.toISOString(), to: end.toISOString() };
}

function toBabyRecord(record: BackendRecord): BabyRecord {
  return {
    clientId: record.clientId,
    event_type: backendEventTypeMap[record.eventType],
    timestamp: record.happenedAt,
    duration: record.duration,
    side: record.side ? backendSideMap[record.side] : undefined,
    amount: record.amount,
    note: record.note
  };
}

export async function fetchDailyRecords(date = formatDateValue(new Date())): Promise<BabyRecord[]> {
  const { from, to } = getDateRange(date);
  const params = new URLSearchParams({ babyId: getBabyId(), from, to });
  const response = await apiFetch(`${API_BASE_URL}/records?${params.toString()}`);
  if (!response.ok) throw new Error('Fetch today records failed');
  const result: { items: BackendRecord[] } = await response.json();
  return result.items.map(toBabyRecord);
}

function normalizeBaby(baby: Baby): Baby {
  return {
    ...baby,
    birthday: baby.birthday ? String(baby.birthday).slice(0, 10) : null
  };
}

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

export async function getBaby(id: string): Promise<Baby> {
  const response = await apiFetch(`${API_BASE_URL}/babies/${id}`);
  if (!response.ok) throw new Error('Get baby failed');
  return normalizeBaby(await response.json());
}

export async function updateBaby(id: string, data: Partial<Baby>): Promise<Baby> {
  const response = await apiFetch(`${API_BASE_URL}/babies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error(`Update baby failed: ${await response.text()}`);
  return normalizeBaby(await response.json());
}

export async function getBabies(): Promise<Baby[]> {
  const response = await apiFetch(`${API_BASE_URL}/babies`);
  if (!response.ok) throw new Error('Get babies failed');
  const list: Baby[] = await response.json();
  return list.map(normalizeBaby);
}
