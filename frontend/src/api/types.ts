/** 与 openapi.yaml 对齐的接口类型（事实源：openapi.yaml，不虚构字段） */

export type CaseLine = 'CLEARING' | 'ACCOUNTING' | 'SUPERVISION';
export type CaseDimension = 'CONCEPT' | 'PROCESS' | 'RISK' | 'EXPRESSION';
export type ReviewerMode = string;
export type AnswerMode = string;

export interface CurrentUser {
  employeeNo: string;
  displayName: string;
}

export interface CsrfResponse {
  token: string;
  headerName: string;
}

export interface CaseSummary {
  id: string;
  line: CaseLine;
  title: string;
  summary: string;
  difficulty: string;
  estimatedMinutes: number;
  placeholder: boolean;
  version: string;
}

export interface CaseDetail extends CaseSummary {
  background: string;
  tasks: string[];
}

export interface SubmissionRequest {
  clientRequestId: string;
  answer: string;
}

export interface PointResult {
  pointId: string;
  description: string;
  /** 服务端历史字段：仅用于内部计算展示总览，不在界面解释为评分规则 */
  weight: number;
  matched: boolean;
  evidence: string;
}

export interface DimensionResult {
  dimension: CaseDimension;
  score: number;
  maxScore: number;
  points: PointResult[];
}

export interface LearningSuggestion {
  knowledgeTopicId: string;
  text: string;
}

export interface TrainingRecordDetail {
  recordId: number;
  caseId: string;
  caseVersion: string;
  rubricVersion: string;
  caseTitle: string;
  caseLine: string;
  answer: string;
  submittedAt: string;
  reviewerMode: ReviewerMode;
  totalScore: number;
  totalMaxScore: number;
  dimensions: DimensionResult[];
  matchedPointIds: string[];
  missedPointIds: string[];
  learningSuggestions: LearningSuggestion[];
}

export interface TrainingRecordSummary {
  recordId: number;
  caseId: string;
  caseTitle: string;
  caseLine: string;
  totalScore: number;
  totalMaxScore: number;
  reviewerMode: ReviewerMode;
  submittedAt: string;
}

export interface TrainingRecordPage {
  items: TrainingRecordSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface KnowledgeTopic {
  topicId: string;
  title: string;
  route: string;
}

export interface Citation {
  topicId: string;
  title: string;
}

export interface KnowledgeAnswer {
  answer: string;
  citations: Citation[];
  insufficientKnowledge: boolean;
  answerMode: AnswerMode;
}
