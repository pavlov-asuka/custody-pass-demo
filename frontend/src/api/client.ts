import type {
  ApiErrorBody,
  AttemptResponse,
  CsrfResponse,
  CurrentUser,
  DraftResponse,
  Line,
  MapResponse,
  PracticeFeedback,
  RemediationFeedback,
  RemediationPlan,
  RouteOverview,
  RouteProgress,
  StepResponse,
  StepType,
  TrainingRecordPage,
  WorldsResponse,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
  }
}

let csrf: CsrfResponse | null = null;

async function parseError(response: Response): Promise<never> {
  let body: ApiErrorBody;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = { code: 'NETWORK_RESPONSE_ERROR', message: '服务响应无法读取，请稍后重试。' };
  }
  throw new ApiError(response.status, body);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { csrf?: boolean; retryCsrf?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');

  if (options.csrf) {
    const token = csrf ?? (await getCsrf());
    headers.set(token.headerName, token.token);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: '暂时无法连接学习服务，请检查网络后重试。',
    });
  }

  if (
    options.csrf &&
    options.retryCsrf !== false &&
    response.status === 403
  ) {
    csrf = null;
    await getCsrf();
    return request<T>(path, init, { csrf: true, retryCsrf: false });
  }

  if (response.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('custody-training:unauthorized'));
  }
  if (!response.ok) return parseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getCsrf(): Promise<CsrfResponse> {
  if (csrf) return csrf;
  csrf = await request<CsrfResponse>('/api/auth/csrf');
  return csrf;
}

export async function login(employeeNo: string, password: string): Promise<CurrentUser> {
  await getCsrf();
  return request<CurrentUser>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ employeeNo, password }) },
    { csrf: true },
  );
}

export function getCurrentUser(): Promise<CurrentUser> {
  return request<CurrentUser>('/api/auth/me');
}

export async function logout(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' }, { csrf: true });
  csrf = null;
}

export function getWorlds(): Promise<WorldsResponse> {
  return request<WorldsResponse>('/api/worlds');
}

export function getMap(line: Line): Promise<MapResponse> {
  return request<MapResponse>(`/api/lines/${line}/map`);
}

export function getRoute(routeId: string): Promise<RouteOverview> {
  return request<RouteOverview>(`/api/routes/${encodeURIComponent(routeId)}`);
}

export function getStep<T extends StepType>(
  routeId: string,
  stepType: T,
): Promise<StepResponse<T>> {
  return request<StepResponse<T>>(
    `/api/routes/${encodeURIComponent(routeId)}/steps/${stepType}`,
  );
}

export function completeStep(
  routeId: string,
  stepType: StepType,
  contentVersion: string,
  eventId: string,
): Promise<RouteProgress> {
  return request<RouteProgress>(
    `/api/routes/${encodeURIComponent(routeId)}/steps/${stepType}/complete`,
    { method: 'POST', body: JSON.stringify({ eventId, contentVersion }) },
    { csrf: true },
  );
}

export function answerPractice(
  routeId: string,
  questionId: string,
  contentVersion: string,
  answer: string[],
  requestId: string,
): Promise<PracticeFeedback> {
  return request<PracticeFeedback>(
    `/api/routes/${encodeURIComponent(routeId)}/basic-practice/${encodeURIComponent(questionId)}/answers`,
    { method: 'POST', body: JSON.stringify({ requestId, contentVersion, answer }) },
    { csrf: true },
  );
}

export function getDraft(routeId: string): Promise<DraftResponse> {
  return request<DraftResponse>(`/api/routes/${encodeURIComponent(routeId)}/draft`);
}

export function saveDraft(
  routeId: string,
  contentVersion: string,
  answer: string,
  expectedRevision: number,
): Promise<DraftResponse> {
  return request<DraftResponse>(
    `/api/routes/${encodeURIComponent(routeId)}/draft`,
    {
      method: 'PUT',
      body: JSON.stringify({ contentVersion, answer, expectedRevision }),
    },
    { csrf: true },
  );
}

export function submitAttempt(
  routeId: string,
  body: {
    clientRequestId: string;
    contentVersion: string;
    rubricVersion: string;
    answer: string;
  },
): Promise<AttemptResponse> {
  return request<AttemptResponse>(
    `/api/routes/${encodeURIComponent(routeId)}/attempts`,
    { method: 'POST', body: JSON.stringify(body) },
    { csrf: true },
  );
}

export function getAttempt(attemptId: number): Promise<AttemptResponse> {
  return request<AttemptResponse>(`/api/attempts/${attemptId}`);
}

export function retryScoring(attemptId: number): Promise<AttemptResponse> {
  return request<AttemptResponse>(
    `/api/attempts/${attemptId}/retry-scoring`,
    { method: 'POST' },
    { csrf: true },
  );
}

export function getRemediation(attemptId: number): Promise<RemediationPlan> {
  return request<RemediationPlan>(`/api/attempts/${attemptId}/remediation`);
}

export function answerRemediation(
  attemptId: number,
  targetId: string,
  answer: string[],
  requestId: string,
): Promise<RemediationFeedback> {
  return request<RemediationFeedback>(
    `/api/attempts/${attemptId}/remediation/${encodeURIComponent(targetId)}/answers`,
    { method: 'POST', body: JSON.stringify({ requestId, answer }) },
    { csrf: true },
  );
}

export function unlockChallenge(attemptId: number): Promise<{
  routeId: string;
  stepType: StepType;
  challengeUnlocked: boolean;
}> {
  return request(
    `/api/attempts/${attemptId}/challenge`,
    { method: 'POST' },
    { csrf: true },
  );
}

export function getTrainingRecords(params: {
  page?: number;
  size?: number;
  line?: Line;
  conclusion?: string;
}): Promise<TrainingRecordPage> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));
  if (params.line) query.set('line', params.line);
  if (params.conclusion) query.set('conclusion', params.conclusion);
  return request<TrainingRecordPage>(`/api/training-records?${query}`);
}

export function getTrainingRecord(attemptId: number): Promise<AttemptResponse> {
  return request<AttemptResponse>(`/api/training-records/${attemptId}`);
}
