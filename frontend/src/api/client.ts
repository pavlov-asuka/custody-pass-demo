import type {
  CaseDetail,
  CaseLine,
  CaseSummary,
  CsrfResponse,
  CurrentUser,
  KnowledgeAnswer,
  KnowledgeTopic,
  TrainingRecordDetail,
  TrainingRecordPage,
  TrainingRecordSummary,
} from './types';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(status: number, code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isServer(): boolean {
    return this.status >= 500 || this.status === 0;
  }
}

/** CSRF 令牌只保存在本次页面会话的内存中，不落盘 */
let csrf: CsrfResponse | null = null;
let csrfInflight: Promise<CsrfResponse> | null = null;

/** 401 时由 AuthProvider 注入的全局处理（清空用户态、回登录页） */
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function fetchCsrf(): Promise<CsrfResponse> {
  if (!csrfInflight) {
    csrfInflight = (async () => {
      const res = await fetch('/api/auth/csrf', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new ApiError(res.status, 'INTERNAL_ERROR', '安全初始化失败，请稍后重试');
      }
      const data = (await res.json()) as CsrfResponse;
      csrf = data;
      return data;
    })().finally(() => {
      csrfInflight = null;
    });
  }
  return csrfInflight;
}

export async function ensureCsrf(): Promise<CsrfResponse> {
  return csrf ?? fetchCsrf();
}

export function clearCsrf(): void {
  csrf = null;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** 登录等接口的 401 属于业务结果，不触发全局登出 */
  skipAuthHandler?: boolean;
  /** 403 时已自动重取 CSRF 重试过一次，不再循环 */
  _retriedAfter403?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthHandler = false, _retriedAfter403 = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    const token = await ensureCsrf();
    headers[token.headerName] = token.token;
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '网络连接异常，请检查网络后重试');
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  let code: ApiErrorCode = 'INTERNAL_ERROR';
  let message = '服务暂时不可用，请稍后重试';
  try {
    const errBody = (await res.json()) as { code?: string; message?: string };
    if (errBody.code) code = errBody.code as ApiErrorCode;
    if (errBody.message) message = errBody.message;
  } catch {
    /* 非 JSON 错误体，使用默认文案 */
  }

  if (res.status === 401 && !skipAuthHandler) {
    unauthorizedHandler?.();
  }

  if (res.status === 403 && method === 'POST' && !_retriedAfter403) {
    // CSRF 可能已轮换：重新获取后原样重试一次；仍失败则交给界面提示
    clearCsrf();
    try {
      await fetchCsrf();
    } catch {
      throw new ApiError(403, 'FORBIDDEN', '安全校验失败，请稍后重试');
    }
    return request<T>(path, { ...options, _retriedAfter403: true });
  }

  throw new ApiError(res.status, code, message);
}

export const api = {
  login(employeeNo: string, password: string): Promise<CurrentUser> {
    return request<CurrentUser>('/api/auth/login', {
      method: 'POST',
      body: { employeeNo, password },
      skipAuthHandler: true,
    });
  },
  me(): Promise<CurrentUser> {
    return request<CurrentUser>('/api/auth/me', { skipAuthHandler: true });
  },
  logout(): Promise<void> {
    return request<void>('/api/auth/logout', { method: 'POST', skipAuthHandler: true });
  },
  listCases(line?: CaseLine): Promise<CaseSummary[]> {
    const query = line ? `?line=${line}` : '';
    return request<CaseSummary[]>(`/api/cases${query}`);
  },
  getCase(caseId: string): Promise<CaseDetail> {
    return request<CaseDetail>(`/api/cases/${encodeURIComponent(caseId)}`);
  },
  submitAnswer(caseId: string, clientRequestId: string, answer: string): Promise<TrainingRecordDetail> {
    return request<TrainingRecordDetail>(`/api/cases/${encodeURIComponent(caseId)}/submissions`, {
      method: 'POST',
      body: { clientRequestId, answer },
    });
  },
  listRecords(page: number, size: number): Promise<TrainingRecordPage> {
    return request<TrainingRecordPage>(`/api/training-records?page=${page}&size=${size}`);
  },
  /** 全量拉取当前学员训练记录（分页循环，防御上限 20 页） */
  async listAllRecords(): Promise<TrainingRecordSummary[]> {
    const size = 50;
    const maxPages = 20;
    const first = await api.listRecords(0, size);
    const items = [...first.items];
    for (let page = 1; page < first.totalPages && page < maxPages; page += 1) {
      const next = await api.listRecords(page, size);
      items.push(...next.items);
    }
    return items;
  },
  getRecord(recordId: number): Promise<TrainingRecordDetail> {
    return request<TrainingRecordDetail>(`/api/training-records/${recordId}`);
  },
  listTopics(): Promise<KnowledgeTopic[]> {
    return request<KnowledgeTopic[]>('/api/knowledge/topics');
  },
  askKnowledge(question: string): Promise<KnowledgeAnswer> {
    return request<KnowledgeAnswer>('/api/knowledge/questions', {
      method: 'POST',
      body: { question },
    });
  },
};

export function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // 兜底：满足契约 pattern 的随机串
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let id = 'req-';
  for (let i = 0; i < 28; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
