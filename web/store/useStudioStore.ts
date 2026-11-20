'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppMode,
  TrainerTab,
  InspectorTab,
  FileEntry,
  RequestPreset,
  ExecutionResult,
  ExerciseTestRunResult,
  Subconcept,
} from '../types/studio';

export interface StudioState {
  // Navigation & Layout State (Persisted)
  mode: AppMode;
  trainerTab: TrainerTab;
  inspectorTab: InspectorTab;
  currentSubconceptId: string;
  currentTemplateId: string;
  activeFileIndex: number;
  sidebarCollapsed: boolean;
  trainerCollapsed: boolean;
  sidebarWidth: number;
  trainerPaneWidth: number;
  editorHeightPercent: number;
  payloadHeight: number;

  // Persistent User Progress & File Buffers (Saved to localStorage across refreshes!)
  completedIds: string[];
  savedBuffers: Record<string, FileEntry[]>;
  lastSavedAt: string | null;

  // HTTP Request Bar State (Persisted)
  reqMethod: string;
  reqUrl: string;
  reqHeaders: string;
  reqBody: string;
  authPersona: string;
  payloadDrawerOpen: boolean;

  // Ephemeral Runtime Output
  lastExecutionResult: ExecutionResult | null;
  testResults: ExerciseTestRunResult[];
  hintVisible: boolean;
  conceptSearch: string;
  syntaxSearch: string;
  activeDecompilerId: string;
  stateVersion: number;

  // Actions
  setMode: (mode: AppMode) => void;
  setTrainerTab: (tab: TrainerTab, sub?: Subconcept) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  selectSubconcept: (sub: Subconcept, tab?: TrainerTab) => void;
  selectTemplate: (templateId: string, defaultFiles: FileEntry[], presets: RequestPreset[]) => void;
  setActiveFileIndex: (idx: number) => void;
  toggleSidebar: () => void;
  toggleTrainer: () => void;
  setSidebarWidth: (width: number) => void;
  setTrainerPaneWidth: (width: number) => void;
  setEditorHeightPercent: (pct: number) => void;
  setPayloadHeight: (height: number) => void;

  getBufferKey: () => string;
  getCurrentFiles: (defaultFiles: FileEntry[]) => FileEntry[];
  updateActiveFileCode: (code: string, defaultFiles: FileEntry[]) => void;
  setFilesForCurrentBuffer: (files: FileEntry[]) => void;
  addSandboxFile: (name: string, defaultFiles: FileEntry[]) => void;

  markCompleted: (subId: string) => void;
  setReqMethod: (method: string) => void;
  setReqUrl: (url: string) => void;
  setReqHeaders: (headers: string) => void;
  setReqBody: (body: string) => void;
  setAuthPersona: (persona: string) => void;
  setPayloadDrawerOpen: (open: boolean) => void;
  applyPreset: (preset: RequestPreset) => void;

  setLastExecutionResult: (res: ExecutionResult | null) => void;
  setTestResults: (results: ExerciseTestRunResult[]) => void;
  setHintVisible: (visible: boolean) => void;
  setConceptSearch: (q: string) => void;
  setSyntaxSearch: (q: string) => void;
  setActiveDecompilerId: (id: string) => void;
  bumpStateVersion: () => void;
}

export function buildExercisePresets(sub?: Subconcept): RequestPreset[] {
  if (!sub?.exercise?.tests) return sub?.presets || [];
  return sub.exercise.tests.map((t, idx) => {
    const req = Array.isArray(t.steps) ? t.steps[0] : t.request;
    return {
      label: `Ex Test ${idx + 1}: ${req?.method || 'GET'} ${req?.url || '/'}`,
      method: req?.method || 'GET',
      url: req?.url || '/',
      headers: req?.headers || {},
      body: req?.body !== undefined ? req.body : '',
    };
  });
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      mode: 'trainer',
      trainerTab: 'learn',
      inspectorTab: 'response',
      currentSubconceptId: 'arch-controllers',
      currentTemplateId: 'kampus-full-blueprint',
      activeFileIndex: 0,
      sidebarCollapsed: false,
      trainerCollapsed: false,
      sidebarWidth: 270,
      trainerPaneWidth: 420,
      editorHeightPercent: 50,
      payloadHeight: 72,

      completedIds: [],
      savedBuffers: {},
      lastSavedAt: null,

      reqMethod: 'GET',
      reqUrl: '/listings?campusZone=North Gate',
      reqHeaders: '{\n  "x-campus-client": "student-web"\n}',
      reqBody: '',
      authPersona: 'none',
      payloadDrawerOpen: false,

      lastExecutionResult: null,
      testResults: [],
      hintVisible: false,
      conceptSearch: '',
      syntaxSearch: '',
      activeDecompilerId: 'dec-controller',
      stateVersion: 0,

      getBufferKey: () => {
        const s = get();
        if (s.mode === 'sandbox') {
          return `sandbox:${s.currentTemplateId}`;
        }
        return `trainer:${s.currentSubconceptId}:${s.trainerTab}`;
      },

      getCurrentFiles: (defaultFiles: FileEntry[]) => {
        const key = get().getBufferKey();
        const saved = get().savedBuffers[key];
        if (saved && saved.length > 0) {
          // Ensure every referenced file in defaultFiles is present in the IDE tabs
          const defaultNames = new Set(defaultFiles.map((df) => df.name));
          const hasAllDefaults = defaultFiles.every((df) =>
            saved.some((sf) => sf.name === df.name),
          );
          if (hasAllDefaults) {
            return saved;
          }
          const merged = defaultFiles.map((df) => {
            const match = saved.find((sf) => sf.name === df.name);
            return match && saved.length >= defaultFiles.length
              ? { name: match.name, code: match.code }
              : { name: df.name, code: df.code };
          });
          for (const extra of saved) {
            if (!defaultNames.has(extra.name)) {
              merged.push({ name: extra.name, code: extra.code });
            }
          }
          return merged;
        }
        return defaultFiles.map((f) => ({ name: f.name, code: f.code }));
      },

      updateActiveFileCode: (code: string, defaultFiles: FileEntry[]) => {
        const s = get();
        const key = s.getBufferKey();
        const currentList = s.getCurrentFiles(defaultFiles).map((f) => ({ ...f }));
        if (currentList[s.activeFileIndex]) {
          currentList[s.activeFileIndex].code = code;
        }
        const nowStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        set({
          savedBuffers: {
            ...s.savedBuffers,
            [key]: currentList,
          },
          lastSavedAt: nowStr,
        });
      },

      setFilesForCurrentBuffer: (files: FileEntry[]) => {
        const s = get();
        const key = s.getBufferKey();
        const nowStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        set({
          savedBuffers: {
            ...s.savedBuffers,
            [key]: files.map((f) => ({ name: f.name, code: f.code })),
          },
          activeFileIndex: 0,
          lastSavedAt: nowStr,
        });
      },

      addSandboxFile: (name: string, defaultFiles: FileEntry[]) => {
        const s = get();
        const cleanName = name.endsWith('.ts') ? name : `${name}.ts`;
        const currentList = s.getCurrentFiles(defaultFiles).map((f) => ({ ...f }));
        currentList.push({
          name: cleanName,
          code: `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class CustomProvider {}\n`,
        });
        const key = s.getBufferKey();
        set({
          savedBuffers: {
            ...s.savedBuffers,
            [key]: currentList,
          },
          activeFileIndex: currentList.length - 1,
        });
      },

      setMode: (mode: AppMode) => set({ mode, activeFileIndex: 0 }),

      setTrainerTab: (tab: TrainerTab, sub?: Subconcept) => {
        set({ trainerTab: tab, activeFileIndex: 0, hintVisible: false });
        if (sub) {
          const presets = tab === 'exercise' ? buildExercisePresets(sub) : sub.presets || [];
          if (presets[0]) {
            get().applyPreset(presets[0]);
          }
        }
      },

      setInspectorTab: (inspectorTab: InspectorTab) => set({ inspectorTab }),

      selectSubconcept: (sub: Subconcept, tab: TrainerTab = 'learn') => {
        set({
          currentSubconceptId: sub.id,
          trainerTab: tab,
          activeFileIndex: 0,
          hintVisible: false,
          testResults: [],
        });
        const presets = tab === 'exercise' ? buildExercisePresets(sub) : sub.presets || [];
        if (presets[0]) {
          get().applyPreset(presets[0]);
        }
      },

      selectTemplate: (templateId: string, _defaultFiles: FileEntry[], presets: RequestPreset[]) => {
        set({
          currentTemplateId: templateId,
          activeFileIndex: 0,
        });
        if (presets[0]) {
          get().applyPreset(presets[0]);
        }
      },

      setActiveFileIndex: (activeFileIndex: number) => set({ activeFileIndex }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleTrainer: () => set((s) => ({ trainerCollapsed: !s.trainerCollapsed })),
      setSidebarWidth: (sidebarWidth: number) =>
        set({ sidebarWidth: Math.max(180, Math.min(520, sidebarWidth)) }),
      setTrainerPaneWidth: (trainerPaneWidth: number) =>
        set({ trainerPaneWidth: Math.max(260, Math.min(760, trainerPaneWidth)) }),
      setEditorHeightPercent: (editorHeightPercent: number) =>
        set({ editorHeightPercent: Math.max(16, Math.min(82, editorHeightPercent)) }),
      setPayloadHeight: (payloadHeight: number) =>
        set({ payloadHeight: Math.max(44, Math.min(260, payloadHeight)) }),

      markCompleted: (subId: string) =>
        set((s) => ({
          completedIds: s.completedIds.includes(subId)
            ? s.completedIds
            : [...s.completedIds, subId],
        })),

      setReqMethod: (reqMethod: string) => set({ reqMethod }),
      setReqUrl: (reqUrl: string) => set({ reqUrl }),
      setReqHeaders: (reqHeaders: string) => set({ reqHeaders }),
      setReqBody: (reqBody: string) => set({ reqBody }),
      setPayloadDrawerOpen: (payloadDrawerOpen: boolean) => set({ payloadDrawerOpen }),

      setAuthPersona: (persona: string) => {
        let headers: Record<string, string> = {};
        try {
          headers = JSON.parse(get().reqHeaders || '{}');
        } catch {
          headers = {};
        }
        delete headers['Authorization'];
        delete headers['authorization'];
        delete headers['x-api-key'];

        if (persona === 'user') headers['Authorization'] = 'Bearer demo-student-jwt';
        else if (persona === 'moderator') headers['Authorization'] = 'Bearer demo-landlord-jwt';
        else if (persona === 'admin') headers['Authorization'] = 'Bearer demo-admin-jwt';
        else if (persona === 'expired') headers['Authorization'] = 'Bearer demo-expired-jwt';
        else if (persona === 'apikey') headers['x-api-key'] = 'kampus-partner-key';

        set({
          authPersona: persona,
          reqHeaders: JSON.stringify(headers, null, 2),
        });
      },

      applyPreset: (preset: RequestPreset) => {
        const headersObj = { ...(preset.headers || {}) };
        const auth = headersObj['Authorization'] || headersObj['authorization'] || '';
        let authPersona = 'none';
        if (auth === 'Bearer demo-student-jwt' || auth === 'Bearer demo-user-jwt') authPersona = 'user';
        else if (auth === 'Bearer demo-landlord-jwt' || auth === 'Bearer demo-mod-jwt')
          authPersona = 'moderator';
        else if (auth === 'Bearer demo-admin-jwt') authPersona = 'admin';
        else if (auth === 'Bearer demo-expired-jwt') authPersona = 'expired';
        else if (headersObj['x-api-key']) authPersona = 'apikey';

        const bodyStr =
          preset.body === undefined || preset.body === ''
            ? ''
            : typeof preset.body === 'object'
              ? JSON.stringify(preset.body, null, 2)
              : String(preset.body);

        const method = preset.method || 'GET';
        const hasBody = Boolean(bodyStr && bodyStr.trim().length > 0);

        set({
          reqMethod: method,
          reqUrl: preset.url || '/',
          reqHeaders: JSON.stringify(headersObj, null, 2),
          reqBody: bodyStr,
          authPersona,
          payloadDrawerOpen: hasBody || Object.keys(headersObj).length > 0 ? get().payloadDrawerOpen : get().payloadDrawerOpen,
        });
      },

      setLastExecutionResult: (lastExecutionResult: ExecutionResult | null) =>
        set({ lastExecutionResult }),
      setTestResults: (testResults: ExerciseTestRunResult[]) => set({ testResults }),
      setHintVisible: (hintVisible: boolean) => set({ hintVisible }),
      setConceptSearch: (conceptSearch: string) => set({ conceptSearch }),
      setSyntaxSearch: (syntaxSearch: string) => set({ syntaxSearch }),
      setActiveDecompilerId: (activeDecompilerId: string) => set({ activeDecompilerId }),
      bumpStateVersion: () => set((s) => ({ stateVersion: s.stateVersion + 1 })),
    }),
    {
      name: 'kampus_nestjs_studio_v3',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mode: state.mode,
        trainerTab: state.trainerTab,
        currentSubconceptId: state.currentSubconceptId,
        currentTemplateId: state.currentTemplateId,
        sidebarCollapsed: state.sidebarCollapsed,
        trainerCollapsed: state.trainerCollapsed,
        sidebarWidth: state.sidebarWidth,
        trainerPaneWidth: state.trainerPaneWidth,
        editorHeightPercent: state.editorHeightPercent,
        payloadHeight: state.payloadHeight,
        completedIds: state.completedIds,
        savedBuffers: state.savedBuffers,
        lastSavedAt: state.lastSavedAt,
        reqMethod: state.reqMethod,
        reqUrl: state.reqUrl,
        reqHeaders: state.reqHeaders,
        reqBody: state.reqBody,
        authPersona: state.authPersona,
        payloadDrawerOpen: state.payloadDrawerOpen,
      }),
    },
  ),
);
