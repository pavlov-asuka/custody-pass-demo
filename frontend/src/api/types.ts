export type Line = 'CLEARING' | 'ACCOUNTING' | 'SUPERVISION';
export type Availability = 'OPEN' | 'BUILDING';
export type RouteState =
  | 'LOCKED'
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'LEARNED_NOT_MASTERED'
  | 'PASSED';
export type StepType =
  | 'KNOWLEDGE_CARD'
  | 'DEMONSTRATION'
  | 'BASIC_PRACTICE'
  | 'EXCEPTION_CASE';
export type ProcessingStatus = 'SCORING' | 'COMPLETED' | 'FAILED';
export type Conclusion = 'PASSED' | 'LEARNED_NOT_MASTERED';
export type Dimension = 'CONCEPT' | 'PROCESS' | 'RISK' | 'EXPRESSION';

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface CsrfResponse {
  token: string;
  headerName: string;
}

export interface CurrentUser {
  employeeNo: string;
  displayName: string;
}

export interface World {
  line: Line;
  name: string;
  description?: string;
  availability: Availability;
  sceneAssetId?: string;
  passedRequiredRoutes: number;
  publishedRequiredRoutes: number;
  progressPercent: number;
  status: 'BUILDING' | 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | string;
}

export interface WorldsResponse {
  mapVersion: string;
  worlds: World[];
}

export interface MapNode {
  nodeId: string;
  nodeType: string;
  routeId: string;
  title: string;
  pathType: string;
  position: 'LEFT' | 'CENTER' | 'RIGHT' | string;
  state: RouteState;
  locked: boolean;
  contentAvailability: 'PUBLISHED' | 'BUILDING' | string;
  enterable: boolean;
  completedSteps: number;
  totalSteps: number;
  prerequisiteNodeIds: string[];
}

export interface MapModule {
  moduleId: string;
  name: string;
  nodes: MapNode[];
}

export interface MapRegion {
  regionId: string;
  name: string;
  description?: string;
  modules: MapModule[];
}

export interface MapResponse {
  line: Line;
  name: string;
  mapVersion: string;
  regions: MapRegion[];
  recommendedNodeId: string | null;
  progress: {
    passedRequiredRoutes: number;
    publishedRequiredRoutes: number;
    percent: number;
  };
}

export interface RouteStepStatus {
  stepType: StepType;
  completed: boolean;
  accessible: boolean;
}

export interface RouteOverview {
  routeId: string;
  contentVersion: string;
  rubricVersion: string;
  line: Line;
  title: string;
  summary?: string;
  estimatedMinutes?: number;
  objectives?: string[];
  state: RouteState;
  enterable: boolean;
  steps: RouteStepStatus[];
  nextStep: StepType | null;
  completedSteps: number;
  totalSteps: number;
}

export interface KnowledgeCard {
  cardId: string;
  type: string;
  title: string;
  conclusion: string;
  items: string[];
}

export interface KnowledgeContent {
  cards: KnowledgeCard[];
}

export interface DemonstrationContent {
  scenario: {
    role: string;
    product: string;
    date: string;
    facts: string[];
  };
  steps: Array<{
    order: number;
    action: string;
    reason: string;
  }>;
  summary: string;
}

export interface ChoiceOption {
  optionId: string;
  text: string;
}

export interface OrderingItem {
  itemId: string;
  text: string;
}

export interface PracticeQuestion {
  questionId: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'ORDERING' | string;
  prompt: string;
  options?: ChoiceOption[];
  items?: OrderingItem[];
}

export interface BasicPracticeContent {
  questions: PracticeQuestion[];
}

export interface ExceptionCaseContent {
  scenario: {
    role: string;
    date: string;
    facts: string[];
    product?: string;
  };
  tasks: string[];
  writingPrompts?: string[];
}

export interface StepContentByType {
  KNOWLEDGE_CARD: KnowledgeContent;
  DEMONSTRATION: DemonstrationContent;
  BASIC_PRACTICE: BasicPracticeContent;
  EXCEPTION_CASE: ExceptionCaseContent;
}

export interface StepResponse<T extends StepType = StepType> {
  routeId: string;
  contentVersion: string;
  stepType: T;
  content: StepContentByType[T];
  completed: boolean;
}

export interface RouteProgress {
  routeId: string;
  state: RouteState;
  completedSteps: number;
  totalSteps: number;
  nextStep: StepType | null;
}

export interface PracticeFeedback {
  questionId: string;
  correct: boolean;
  correctOnce: boolean;
  explanation: string;
  hint?: string;
  practiceCompleted: boolean;
  progress: RouteProgress;
}

export interface DraftResponse {
  routeId: string;
  contentVersion?: string;
  answer?: string;
  revision: number;
  updatedAt: string | null;
}

export interface DimensionItem {
  matched: boolean;
  evidence: string;
}

export interface DimensionScore {
  dimension: Dimension;
  score: number;
  maxScore: number;
  items: DimensionItem[];
}

export interface ScoringResult {
  totalScore: number;
  passScore: number;
  conclusion: Conclusion;
  scoreThresholdMet: boolean;
  allMandatoryRequirementsMet: boolean;
  dimensions: DimensionScore[];
}

export interface RemediationSummary {
  planId: number;
  attemptId: number;
  active: boolean;
  completedTargets: number;
  totalTargets: number;
  completed: boolean;
  challengeUnlocked: boolean;
}

export interface AttemptResponse {
  attemptId: number;
  routeId: string;
  processingStatus: ProcessingStatus;
  submittedAt: string;
  contentVersion: string;
  rubricVersion: string;
  technicalErrorCode?: string;
  result?: ScoringResult;
  answerSnapshot?: string;
  historicalConclusion?: Conclusion;
  currentRouteState?: RouteState;
  remediationSummary?: RemediationSummary;
  allowedActions: string[];
}

export interface RemediationTarget {
  targetId: string;
  title: string;
  reason: string;
  materialStep: StepType;
  materialItemId: string;
  questionId: string;
  completed: boolean;
  practice: PracticeQuestion;
}

export interface RemediationPlan extends RemediationSummary {
  targets: RemediationTarget[];
}

export interface RemediationFeedback {
  targetId: string;
  correct: boolean;
  targetCompleted: boolean;
  planCompleted: boolean;
  explanation: string;
  hint?: string;
}

export interface DimensionSummary {
  dimension: Dimension;
  score: number;
  maxScore: number;
}

export interface TrainingRecord {
  attemptId: number;
  routeId: string;
  path: string;
  routeTitle: string;
  processingStatus: ProcessingStatus;
  conclusion?: Conclusion;
  submittedAt: string;
  totalScore?: number;
  dimensionSummary?: DimensionSummary[];
}

export interface TrainingRecordPage {
  items: TrainingRecord[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
