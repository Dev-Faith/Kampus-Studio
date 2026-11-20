export interface FileEntry {
  name: string;
  code: string;
}

export interface RequestPreset {
  label: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ExerciseTest {
  name: string;
  request?: RequestPreset;
  steps?: RequestPreset[];
  check: (
    lastRes: ExecutionResult,
    state: any,
    allResponses: ExecutionResult[],
  ) => { pass: boolean; reason?: string };
}

export interface ExerciseSpec {
  title: string;
  prompt: string;
  hints?: string[];
  starterFiles: FileEntry[];
  solutionFiles: FileEntry[];
  tests: ExerciseTest[];
}

export interface ArchitecturalDecision {
  question: string;
  antiPattern: string;
  technicalReason: string;
  bestPracticeRule: string;
}

export interface Subconcept {
  id: string;
  code: string;
  title: string;
  difficulty: string;
  summary: string;
  theory: string;
  exampleFiles: FileEntry[];
  presets: RequestPreset[];
  exercise?: ExerciseSpec;
  architecturalDecisions?: ArchitecturalDecision[];
  deepDiveHtml?: string;
  moduleId?: string;
  moduleTitle?: string;
  moduleNumber?: string;
}

export interface CurriculumModule {
  id: string;
  number: string;
  title: string;
  icon?: string;
  description?: string;
  subconcepts: Subconcept[];
}

export interface SandboxTemplate {
  id: string;
  name: string;
  description: string;
  files: FileEntry[];
  presets: RequestPreset[];
}

export interface DecoratorDecompilerItem {
  id: string;
  token: string;
  kind: string;
  summary: string;
  nestjsCode: string;
  vanillaJsCode: string;
  takeaway: string;
}

export interface SyntaxTokenRow {
  nest: string;
  vanilla: string;
  meaning: string;
}

export interface SyntaxComparisonItem {
  id: string;
  title: string;
  badges: string[];
  mentalModel: string;
  nestjsCode: string;
  vanillaCode: string;
  tokenMap: SyntaxTokenRow[];
  sandboxConceptId?: string;
}

export interface SyntaxChapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  items: SyntaxComparisonItem[];
}

export interface PrismaSchemaConstruct {
  id: string;
  badge: string;
  title: string;
  prismaSnippet: string;
  sqlEquivalent: string;
  whyDecision: string;
  bestPractice: string;
}

export interface PrismaTokenRow {
  prismaToken: string;
  sqlOrJsEquivalent: string;
  purpose: string;
}

export interface PrismaChapter {
  id: string;
  number: string;
  category: string;
  title: string;
  subtitle: string;
  sandboxConceptId?: string;
  keyTakeaway: string;
  prismaCode: string;
  rawSqlOrJsCode: string;
  syntaxMap: PrismaTokenRow[];
  decisions: ArchitecturalDecision[];
}

export interface PipelineStep {
  stage: string;
  name: string;
  status: 'pass' | 'transform' | 'short-circuit' | 'error';
  detail: string;
  durationMs: number;
}

export interface ExecutionResult {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: any;
  pipeline: PipelineStep[];
  logs?: any[];
}

export interface ExerciseTestRunResult {
  name: string;
  pass: boolean;
  reason?: string;
  lastRes?: ExecutionResult;
}

export type AppMode =
  | 'trainer'
  | 'syntax'
  | 'prisma'
  | 'mongoose'
  | 'testing'
  | 'sandbox'
  | 'cheatsheet';
export type TrainerTab = 'learn' | 'exercise';
export type InspectorTab = 'response' | 'pipeline' | 'tests' | 'state';

declare global {
  interface Window {
    NEST_CURRICULUM?: CurriculumModule[];
    NEST_SANDBOX_TEMPLATES?: SandboxTemplate[];
    NEST_DECORATOR_DECOMPILER?: DecoratorDecompilerItem[];
    NEST_SYNTAX_CHAPTERS?: SyntaxChapter[];
    NEST_PRISMA_FULL_SCHEMA?: string;
    NEST_PRISMA_SCHEMA_EXPLORER?: PrismaSchemaConstruct[];
    NEST_PRISMA_CHAPTERS?: PrismaChapter[];
    NEST_MONGOOSE_FULL_SCHEMA?: string;
    NEST_MONGOOSE_SCHEMA_EXPLORER?: PrismaSchemaConstruct[];
    NEST_MONGOOSE_CHAPTERS?: PrismaChapter[];
    NEST_TESTING_FULL_SPEC?: string;
    NEST_TESTING_HARNESS_EXPLORER?: any[];
    NEST_TESTING_CHAPTERS?: any[];
    NEST_ARCHITECTURAL_RATIONALE?: Record<string, ArchitecturalDecision[]>;
    renderArchitecturalRationaleHtml?: (decisions: ArchitecturalDecision[]) => string;
    KampusAiTutor?: {
      askTutor: (
        question: string,
        ctx: any,
        apiKey?: string,
        history?: any[],
      ) => Promise<{ answer: string; source: string }>;
      answerQuestionLocally: (question: string, ctx: any, history?: any[]) => string;
      diagnoseStudentCode: (ctx: any) => string;
      explainCurrentEditorCode: (ctx: any) => string;
      explainCurrentArchitecturalWhy: (ctx: any) => string;
      explainHowLessonFilesConnect?: (ctx: any) => string;
      getSuggestedQuestions: (ctx: any) => string[];
    };
    NEST_MONACO_EXTRA_LIBS?: string;
    NestSandboxEngine?: {
      executeRequest: (files: FileEntry[], reqSpec: any) => Promise<ExecutionResult>;
      getState: () => any;
      resetState: () => any;
      PRESET_TOKENS: Record<string, any>;
    };
    monaco?: any;
    require?: any;
  }
}
