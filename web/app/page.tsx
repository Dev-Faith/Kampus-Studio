'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStudioStore, buildExercisePresets } from '../store/useStudioStore';
import { Topbar } from '../components/Topbar';
import { CurriculumSidebar } from '../components/CurriculumSidebar';
import { TrainerPane } from '../components/TrainerPane';
import { CodeWorkbench } from '../components/CodeWorkbench';
import { HttpSimulator, healJsonString } from '../components/HttpSimulator';
import { SyntaxRosettaView } from '../components/SyntaxRosettaView';
import { PrismaMasteryView } from '../components/PrismaMasteryView';
import { MongooseMasteryView } from '../components/MongooseMasteryView';
import {
  TestingMasteryView,
  type TestingChapter,
  type TestingHarnessItem,
} from '../components/TestingMasteryView';
import { CheatSheetView } from '../components/CheatSheetView';
import { KampusTutorBot } from '../components/KampusTutorBot';
import type {
  CurriculumModule,
  DecoratorDecompilerItem,
  ExerciseTestRunResult,
  PrismaChapter,
  PrismaSchemaConstruct,
  RequestPreset,
  SandboxTemplate,
  Subconcept,
  SyntaxChapter,
} from '../types/studio';

export default function StudioHomePage() {
  const [mounted, setMounted] = useState(false);

  const mode = useStudioStore((s) => s.mode);
  const setMode = useStudioStore((s) => s.setMode);
  const trainerTab = useStudioStore((s) => s.trainerTab);
  const setTrainerTab = useStudioStore((s) => s.setTrainerTab);
  const currentSubconceptId = useStudioStore((s) => s.currentSubconceptId);
  const currentTemplateId = useStudioStore((s) => s.currentTemplateId);
  const selectSubconcept = useStudioStore((s) => s.selectSubconcept);
  const getCurrentFiles = useStudioStore((s) => s.getCurrentFiles);
  const reqMethod = useStudioStore((s) => s.reqMethod);
  const reqUrl = useStudioStore((s) => s.reqUrl);
  const reqHeaders = useStudioStore((s) => s.reqHeaders);
  const reqBody = useStudioStore((s) => s.reqBody);
  const setReqBody = useStudioStore((s) => s.setReqBody);
  const applyPreset = useStudioStore((s) => s.applyPreset);
  const setLastExecutionResult = useStudioStore((s) => s.setLastExecutionResult);
  const setTestResults = useStudioStore((s) => s.setTestResults);
  const setInspectorTab = useStudioStore((s) => s.setInspectorTab);
  const markCompleted = useStudioStore((s) => s.markCompleted);
  const bumpStateVersion = useStudioStore((s) => s.bumpStateVersion);
  const sidebarCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const trainerCollapsed = useStudioStore((s) => s.trainerCollapsed);
  const sidebarWidth = useStudioStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStudioStore((s) => s.setSidebarWidth);
  const trainerPaneWidth = useStudioStore((s) => s.trainerPaneWidth);
  const setTrainerPaneWidth = useStudioStore((s) => s.setTrainerPaneWidth);
  const setEditorHeightPercent = useStudioStore((s) => s.setEditorHeightPercent);

  useEffect(() => {
    setMounted(true);
  }, []);

  const curriculum: CurriculumModule[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_CURRICULUM || [];
  }, [mounted]);

  const templates: SandboxTemplate[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_SANDBOX_TEMPLATES || [];
  }, [mounted]);

  const decompilerItems: DecoratorDecompilerItem[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_DECORATOR_DECOMPILER || [];
  }, [mounted]);

  const syntaxChapters: SyntaxChapter[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_SYNTAX_CHAPTERS || [];
  }, [mounted]);

  const prismaFullSchema: string = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return '';
    return window.NEST_PRISMA_FULL_SCHEMA || '';
  }, [mounted]);

  const prismaSchemaExplorer: PrismaSchemaConstruct[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_PRISMA_SCHEMA_EXPLORER || [];
  }, [mounted]);

  const prismaChapters: PrismaChapter[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_PRISMA_CHAPTERS || [];
  }, [mounted]);

  const mongooseFullSchema: string = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return '';
    return window.NEST_MONGOOSE_FULL_SCHEMA || '';
  }, [mounted]);

  const mongooseSchemaExplorer: PrismaSchemaConstruct[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_MONGOOSE_SCHEMA_EXPLORER || [];
  }, [mounted]);

  const mongooseChapters: PrismaChapter[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_MONGOOSE_CHAPTERS || [];
  }, [mounted]);

  const testingFullSpec: string = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return '';
    return window.NEST_TESTING_FULL_SPEC || '';
  }, [mounted]);

  const testingHarnessExplorer: TestingHarnessItem[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_TESTING_HARNESS_EXPLORER || [];
  }, [mounted]);

  const testingChapters: TestingChapter[] = useMemo(() => {
    if (!mounted || typeof window === 'undefined') return [];
    return window.NEST_TESTING_CHAPTERS || [];
  }, [mounted]);

  const allSubconcepts: Subconcept[] = useMemo(() => {
    const list: Subconcept[] = [];
    for (const mod of curriculum) {
      for (const sub of mod.subconcepts || []) {
        list.push({
          ...sub,
          moduleId: mod.id,
          moduleTitle: mod.title,
          moduleNumber: mod.number,
        });
      }
    }
    return list;
  }, [curriculum]);

  const activeSubconcept = useMemo(() => {
    return allSubconcepts.find((s) => s.id === currentSubconceptId) || allSubconcepts[0];
  }, [allSubconcepts, currentSubconceptId]);

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === currentTemplateId) || templates[0];
  }, [templates, currentTemplateId]);

  const activeDefaultFiles = useMemo(() => {
    if (mode === 'sandbox') {
      return activeTemplate?.files || [];
    }
    if (!activeSubconcept) return [];
    return trainerTab === 'exercise'
      ? activeSubconcept.exercise?.starterFiles || []
      : activeSubconcept.exampleFiles || [];
  }, [mode, activeTemplate, activeSubconcept, trainerTab]);

  const activePresets: RequestPreset[] = useMemo(() => {
    if (mode === 'sandbox') {
      return activeTemplate?.presets || [];
    }
    if (!activeSubconcept) return [];
    return trainerTab === 'exercise'
      ? buildExercisePresets(activeSubconcept)
      : activeSubconcept.presets || [];
  }, [mode, activeTemplate, activeSubconcept, trainerTab]);

  // Sync URL Hash (#/trainer/arch-controllers/learn) for deep-linking & browser back/forward
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const hash =
      mode === 'trainer'
        ? `#/trainer/${currentSubconceptId}/${trainerTab}`
        : mode === 'sandbox'
          ? `#/sandbox/${currentTemplateId}`
          : `#/${mode}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [mounted, mode, currentSubconceptId, trainerTab, currentTemplateId]);

  const buildRequestSpec = useCallback(() => {
    let headers: Record<string, string> = {};
    try {
      headers = JSON.parse(reqHeaders || '{}');
    } catch {
      headers = {};
    }
    const healedBody = healJsonString(reqBody);
    if (reqBody.trim() && !healedBody.valid && healedBody.healed !== reqBody) {
      setReqBody(healedBody.healed);
    }
    return {
      method: reqMethod,
      url: reqUrl,
      headers,
      body: healedBody.healed || reqBody,
    };
  }, [reqHeaders, reqBody, reqMethod, reqUrl, setReqBody]);

  const handleSendRequest = useCallback(
    async (overrideSpec?: any) => {
      if (typeof window === 'undefined' || !window.NestSandboxEngine) return;
      const files = getCurrentFiles(activeDefaultFiles);
      const spec = overrideSpec || buildRequestSpec();
      const res = await window.NestSandboxEngine.executeRequest(files, spec);
      setLastExecutionResult(res);
      bumpStateVersion();
    },
    [getCurrentFiles, activeDefaultFiles, buildRequestSpec, setLastExecutionResult, bumpStateVersion],
  );

  const handleBurstRequest = useCallback(async () => {
    if (typeof window === 'undefined' || !window.NestSandboxEngine) return;
    const files = getCurrentFiles(activeDefaultFiles);
    const spec = buildRequestSpec();
    const results: any[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await window.NestSandboxEngine.executeRequest(files, spec);
      results.push({
        attempt: i + 1,
        status: r.status,
        headers: r.headers,
        body: r.body,
        pipeline: r.pipeline,
      });
    }
    const last = results[results.length - 1];
    setLastExecutionResult({
      status: last.status,
      statusText: `Burst 5x Complete (Last: ${last.status})`,
      durationMs: results.length,
      headers: last.headers,
      body: {
        burstSummary: results.map((r) => ({
          attempt: r.attempt,
          status: r.status,
          rateLimitRemaining: r.headers['x-ratelimit-remaining'],
          cache: r.headers['x-cache'],
          response: r.body,
        })),
      },
      pipeline: last.pipeline,
    });
    bumpStateVersion();
  }, [getCurrentFiles, activeDefaultFiles, buildRequestSpec, setLastExecutionResult, bumpStateVersion]);

  const handleVerifyExercise = useCallback(async () => {
    if (typeof window === 'undefined' || !window.NestSandboxEngine || !activeSubconcept?.exercise) {
      return;
    }
    if (mode !== 'trainer') setMode('trainer');
    if (trainerTab !== 'exercise') setTrainerTab('exercise', activeSubconcept);

    const exerciseFiles = useStudioStore
      .getState()
      .getCurrentFiles(activeSubconcept.exercise.starterFiles);
    const tests = activeSubconcept.exercise.tests || [];
    const results: ExerciseTestRunResult[] = [];

    for (const t of tests) {
      window.NestSandboxEngine.resetState();
      let lastRes: any = null;
      const allResponses: any[] = [];

      if (Array.isArray(t.steps)) {
        for (const stepReq of t.steps) {
          lastRes = await window.NestSandboxEngine.executeRequest(exerciseFiles, stepReq);
          allResponses.push(lastRes);
        }
      } else if (t.request) {
        lastRes = await window.NestSandboxEngine.executeRequest(exerciseFiles, t.request);
        allResponses.push(lastRes);
      }

      const currentState = window.NestSandboxEngine.getState();
      let verdict: { pass: boolean; reason?: string } = { pass: false, reason: 'Assertion failed' };
      try {
        verdict = t.check(lastRes, currentState, allResponses) || verdict;
      } catch (err: any) {
        verdict = { pass: false, reason: err?.message || 'Test error' };
      }

      results.push({
        name: t.name,
        pass: Boolean(verdict.pass),
        reason: verdict.reason,
        lastRes,
      });
    }

    setTestResults(results);
    if (results.length > 0 && results.every((r) => r.pass)) {
      markCompleted(activeSubconcept.id);
    }
    if (results[results.length - 1]?.lastRes) {
      setLastExecutionResult(results[results.length - 1].lastRes!);
    }
    setInspectorTab('tests');
    bumpStateVersion();
  }, [
    activeSubconcept,
    mode,
    trainerTab,
    setMode,
    setTrainerTab,
    setTestResults,
    markCompleted,
    setLastExecutionResult,
    setInspectorTab,
    bumpStateVersion,
  ]);

  // Run initial request on mount
  useEffect(() => {
    if (mounted && activeDefaultFiles.length > 0) {
      void handleSendRequest();
    }
  }, [mounted]);

  // Global keyboard shortcuts (Ctrl+Enter & Ctrl+Shift+Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        void handleVerifyExercise();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSendRequest();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSendRequest, handleVerifyExercise]);

  if (!mounted) return null;

  const modeLabel =
    mode === 'sandbox'
      ? 'Free Sandbox'
      : trainerTab === 'exercise'
        ? 'Exercise Workspace'
        : 'Example Workspace';

  return (
    <>
      <Topbar
        totalExercises={allSubconcepts.length}
        onResetSandboxState={() => {
          window.NestSandboxEngine?.resetState();
          bumpStateVersion();
        }}
      />

      {mode === 'syntax' ? (
        <SyntaxRosettaView
          decompilerItems={decompilerItems}
          chapters={syntaxChapters}
          onOpenInLiveIde={(conceptId) => {
            const target = allSubconcepts.find((s) => s.id === conceptId);
            if (target) {
              setMode('trainer');
              selectSubconcept(target, 'learn');
            }
          }}
        />
      ) : mode === 'prisma' ? (
        <PrismaMasteryView
          fullSchema={prismaFullSchema}
          schemaExplorer={prismaSchemaExplorer}
          chapters={prismaChapters}
          onOpenInLiveIde={(conceptId) => {
            const target = allSubconcepts.find((s) => s.id === conceptId);
            if (target) {
              setMode('trainer');
              selectSubconcept(target, 'learn');
            }
          }}
        />
      ) : mode === 'mongoose' ? (
        <MongooseMasteryView
          fullSchema={mongooseFullSchema}
          schemaExplorer={mongooseSchemaExplorer}
          chapters={mongooseChapters}
          onOpenInLiveIde={(conceptId) => {
            const target = allSubconcepts.find((s) => s.id === conceptId);
            if (target) {
              setMode('trainer');
              selectSubconcept(target, 'learn');
            }
          }}
        />
      ) : mode === 'testing' ? (
        <TestingMasteryView
          fullSpec={testingFullSpec}
          harnessExplorer={testingHarnessExplorer}
          chapters={testingChapters}
          onOpenInLiveIde={(conceptId) => {
            const target = allSubconcepts.find((s) => s.id === conceptId);
            if (target) {
              setMode('trainer');
              selectSubconcept(target, 'learn');
            }
          }}
        />
      ) : mode === 'cheatsheet' ? (
        <CheatSheetView />
      ) : (
        <main
          className={`workspace ${mode === 'sandbox' ? 'sandbox-mode' : ''} ${
            sidebarCollapsed ? 'sidebar-collapsed' : ''
          } ${trainerCollapsed ? 'trainer-collapsed' : ''}`}
        >
          <CurriculumSidebar
            curriculum={curriculum}
            templates={templates}
            activeDefaultFiles={activeDefaultFiles}
            onSelectSubconcept={(sub) => selectSubconcept(sub, 'learn')}
          />

          {!sidebarCollapsed && (
            <div
              className="resizer-v"
              title="Drag left/right to resize Sidebar (double-click to reset)"
              onDoubleClick={() => setSidebarWidth(270)}
              onMouseDown={(e) => {
                e.preventDefault();
                const targetEl = e.currentTarget;
                targetEl.classList.add('dragging');
                document.body.classList.add('is-resizing-col');
                const startX = e.clientX;
                const startW = sidebarWidth;
                const onMove = (ev: MouseEvent) => {
                  setSidebarWidth(startW + (ev.clientX - startX));
                };
                const onUp = () => {
                  targetEl.classList.remove('dragging');
                  document.body.classList.remove('is-resizing-col');
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />
          )}

          {mode === 'trainer' && !trainerCollapsed && activeSubconcept && (
            <>
              <TrainerPane
                sub={activeSubconcept}
                allSubconcepts={allSubconcepts}
                onRunExerciseVerification={handleVerifyExercise}
                onSelectSubconcept={(sub, tab) => selectSubconcept(sub, tab || 'learn')}
              />
              <div
                className="resizer-v"
                title="Drag left/right to resize Lesson/Exercise Pane (double-click to reset)"
                onDoubleClick={() => setTrainerPaneWidth(420)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const targetEl = e.currentTarget;
                  targetEl.classList.add('dragging');
                  document.body.classList.add('is-resizing-col');
                  const startX = e.clientX;
                  const startW = trainerPaneWidth;
                  const onMove = (ev: MouseEvent) => {
                    setTrainerPaneWidth(startW + (ev.clientX - startX));
                  };
                  const onUp = () => {
                    targetEl.classList.remove('dragging');
                    document.body.classList.remove('is-resizing-col');
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  };
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              />
            </>
          )}

          <section className="workbench" style={{ display: 'flex', flexDirection: 'column' }}>
            <CodeWorkbench
              defaultFiles={activeDefaultFiles}
              modeLabel={modeLabel}
              onSendRequest={() => void handleSendRequest()}
              onVerifyExercise={() => void handleVerifyExercise()}
            />

            <div
              className="resizer-h"
              title="Drag up/down to resize Code Editor vs HTTP Simulator (double-click for 50/50)"
              onDoubleClick={() => setEditorHeightPercent(50)}
              onMouseDown={(e) => {
                e.preventDefault();
                const targetEl = e.currentTarget;
                targetEl.classList.add('dragging');
                document.body.classList.add('is-resizing-row');
                const wbEl = targetEl.closest('.workbench') as HTMLElement | null;
                const rect = wbEl?.getBoundingClientRect();
                const onMove = (ev: MouseEvent) => {
                  if (!rect) return;
                  const relY = ev.clientY - rect.top;
                  const pct = Math.round((relY / rect.height) * 100);
                  setEditorHeightPercent(pct);
                };
                const onUp = () => {
                  targetEl.classList.remove('dragging');
                  document.body.classList.remove('is-resizing-row');
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
            />

            <HttpSimulator
              presets={activePresets}
              onSendRequest={() => void handleSendRequest()}
              onBurstRequest={() => void handleBurstRequest()}
              onApplyPresetAndSend={(preset) => {
                applyPreset(preset);
                void handleSendRequest({
                  method: preset.method || 'GET',
                  url: preset.url || '/',
                  headers: preset.headers || {},
                  body: preset.body ?? '',
                });
              }}
            />
          </section>
        </main>
      )}

      <KampusTutorBot
        activeSubconcept={activeSubconcept}
        currentFiles={getCurrentFiles(activeDefaultFiles)}
      />
    </>
  );
}
