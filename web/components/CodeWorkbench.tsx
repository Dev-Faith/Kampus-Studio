'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import type { FileEntry } from '../types/studio';

interface CodeWorkbenchProps {
  defaultFiles: FileEntry[];
  modeLabel: string;
  onSendRequest: () => void;
  onVerifyExercise: () => void;
}

function PanelIcon({ variant }: { variant: 'left' | 'middle' | 'bottom' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
      {variant === 'left' && <rect x="2.1" y="3.1" width="3.6" height="9.8" rx="1" fill="currentColor" />}
      {variant === 'middle' && (
        <rect x="5.3" y="3.1" width="4.2" height="9.8" fill="currentColor" opacity="0.9" />
      )}
      {variant === 'bottom' && <rect x="2.1" y="9" width="11.8" height="3.9" rx="1" fill="currentColor" />}
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


export function CodeWorkbench({
  defaultFiles,
  modeLabel,
  onVerifyExercise,
}: CodeWorkbenchProps) {
  const activeFileIndex = useStudioStore((s) => s.activeFileIndex);
  const setActiveFileIndex = useStudioStore((s) => s.setActiveFileIndex);
  const getCurrentFiles = useStudioStore((s) => s.getCurrentFiles);
  const updateActiveFileCode = useStudioStore((s) => s.updateActiveFileCode);
  const lastSavedAt = useStudioStore((s) => s.lastSavedAt);
  const editorHeightPercent = useStudioStore((s) => s.editorHeightPercent);
  const mode = useStudioStore((s) => s.mode);
  const sidebarCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const trainerCollapsed = useStudioStore((s) => s.trainerCollapsed);
  const simulatorCollapsed = useStudioStore((s) => s.simulatorCollapsed);
  const toggleSidebar = useStudioStore((s) => s.toggleSidebar);
  const toggleTrainer = useStudioStore((s) => s.toggleTrainer);
  const toggleSimulator = useStudioStore((s) => s.toggleSimulator);
  const cycleCodeExpandStep = useStudioStore((s) => s.cycleCodeExpandStep);
  const sidebarWidth = useStudioStore((s) => s.sidebarWidth);
  const trainerPaneWidth = useStudioStore((s) => s.trainerPaneWidth);

  const files = getCurrentFiles(defaultFiles);
  const activeFile = files[activeFileIndex] || files[0] || { name: 'main.ts', code: '' };

  const monacoMountRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const [monacoReady, setMonacoReady] = useState(false);

  // Keep refs to latest code & change handler so async Monaco init never reads a stale closure
  const latestCodeRef = useRef<string>(activeFile.code);
  latestCodeRef.current = activeFile.code;

  const onCodeChangeRef = useRef<(val: string) => void>(() => {});
  onCodeChangeRef.current = (val: string) => {
    updateActiveFileCode(val, defaultFiles);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isUnmounted = false;

    const createMonacoInstance = () => {
      if (isUnmounted || !monacoMountRef.current || editorInstanceRef.current) return;
      const monaco = window.monaco;
      if (!monaco) return;

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });

      if (window.NEST_MONACO_EXTRA_LIBS) {
        monaco.languages.typescript.typescriptDefaults.addExtraLib(
          window.NEST_MONACO_EXTRA_LIBS,
          'file:///node_modules/@types/kampus-nestjs/index.d.ts',
        );
      }

      const editor = monaco.editor.create(monacoMountRef.current, {
        value: latestCodeRef.current,
        language: 'typescript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        tabSize: 2,
        scrollBeyondLastLine: false,
      });

      editor.onDidChangeModelContent(() => {
        const currentVal = editor.getValue();
        onCodeChangeRef.current(currentVal);
      });

      editorInstanceRef.current = editor;
      setMonacoReady(true);
    };

    const bootRequireAndMonaco = () => {
      if (isUnmounted) return;
      if (window.monaco) {
        createMonacoInstance();
        return;
      }
      if (!window.require) return;
      window.require.config({
        paths: {
          vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs',
        },
      });
      window.require(['vs/editor/editor.main'], () => {
        createMonacoInstance();
      });
    };

    if (window.monaco) {
      createMonacoInstance();
    } else if (window.require) {
      bootRequireAndMonaco();
    } else {
      let script = document.getElementById('monaco-loader-script') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'monaco-loader-script';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs/loader.min.js';
        document.head.appendChild(script);
      }
      script.addEventListener('load', bootRequireAndMonaco);
      return () => {
        isUnmounted = true;
        script?.removeEventListener('load', bootRequireAndMonaco);
        if (editorInstanceRef.current) {
          editorInstanceRef.current.dispose();
          editorInstanceRef.current = null;
        }
      };
    }

    return () => {
      isUnmounted = true;
      if (editorInstanceRef.current) {
        editorInstanceRef.current.dispose();
        editorInstanceRef.current = null;
      }
    };
  }, []);

  // Sync editor value whenever activeFile or its code changes
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (editor && editor.getValue() !== activeFile.code) {
      editor.setValue(activeFile.code);
    }
  }, [activeFile.name, activeFile.code]);

  // Relayout Monaco whenever any surrounding panel is toggled or resized
  useEffect(() => {
    const timer = setTimeout(() => {
      editorInstanceRef.current?.layout?.();
    }, 30);
    return () => clearTimeout(timer);
  }, [
    sidebarCollapsed,
    trainerCollapsed,
    simulatorCollapsed,
    sidebarWidth,
    trainerPaneWidth,
    editorHeightPercent,
  ]);

  // 3-step progressive "large screen" state: Middle → Left → Bottom
  const isTrainerMode = mode === 'trainer';
  const stepFlags = isTrainerMode
    ? [trainerCollapsed, sidebarCollapsed, simulatorCollapsed]
    : [sidebarCollapsed, simulatorCollapsed];
  let stepsDone = 0;
  for (const done of stepFlags) {
    if (!done) break;
    stepsDone++;
  }
  const totalSteps = stepFlags.length;
  const allExpanded = stepsDone === totalSteps;
  const nextStepNames = isTrainerMode
    ? ['Hide Lesson panel', 'Hide Modules panel', 'Hide HTTP panel (fullscreen editor)']
    : ['Hide Modules panel', 'Hide HTTP panel (fullscreen editor)'];
  const expandTitle = allExpanded
    ? 'Restore all panels'
    : `Focus mode — step ${stepsDone + 1} of ${totalSteps}: ${nextStepNames[stepsDone]}`;

  const getFileRoleIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.spec.ts') || lower.endsWith('.test.ts')) return '✅';
    if (lower.endsWith('.controller.ts')) return '🎯';
    if (lower.endsWith('.service.ts')) return '⚙️';
    if (lower.endsWith('.module.ts')) return '🏛️';
    if (lower.endsWith('.dto.ts')) return '📦';
    if (lower.endsWith('.guard.ts')) return '🛡️';
    if (lower.endsWith('.interceptor.ts')) return '🔄';
    if (lower.endsWith('.pipe.ts')) return '🧪';
    if (lower.endsWith('.filter.ts') || lower.endsWith('.exception.ts')) return '🚨';
    if (lower.endsWith('.config.ts')) return '🔧';
    if (lower.endsWith('.decorator.ts')) return '🏷️';
    if (lower.endsWith('.middleware.ts')) return '⛓️';
    if (lower.endsWith('.listener.ts') || lower.endsWith('.event.ts')) return '📡';
    if (lower.endsWith('.schema.ts') || lower.endsWith('.prisma')) return '💎';
    return '📄';
  };

  return (
    <div
      className="editor-section"
      style={{ height: simulatorCollapsed ? '100%' : `${editorHeightPercent}%` }}
    >
      <div className="editor-tabbar">
        <div className="file-tabs" role="tablist" aria-label="Open files">
          {files.map((f, idx) => {
            const hasTodo = f.code?.includes('// TODO');
            return (
              <button
                key={f.name + idx}
                type="button"
                role="tab"
                aria-selected={idx === activeFileIndex}
                className={`file-tab ${idx === activeFileIndex ? 'active' : ''}`}
                onClick={() => setActiveFileIndex(idx)}
                title={
                  hasTodo
                    ? `${f.name} — contains exercise // TODO items`
                    : `${f.name} (${files.length} files in this workspace)`
                }
              >
                <span className="file-tab-icon" aria-hidden="true">
                  {getFileRoleIcon(f.name)}
                </span>
                <span className="file-tab-name">{f.name}</span>
                {hasTodo && <span className="file-tab-todo" title="Has TODO items" />}
              </button>
            );
          })}
        </div>

        <div className="editor-actions">
          <div className="tb-group" role="group" aria-label="Toggle panels">
            <button
              type="button"
              className={`tb-icon-btn ${!sidebarCollapsed ? 'is-on' : ''}`}
              onClick={toggleSidebar}
              aria-pressed={!sidebarCollapsed}
              title={sidebarCollapsed ? 'Show Modules panel' : 'Hide Modules panel'}
            >
              <PanelIcon variant="left" />
            </button>
            {isTrainerMode && (
              <button
                type="button"
                className={`tb-icon-btn ${!trainerCollapsed ? 'is-on' : ''}`}
                onClick={toggleTrainer}
                aria-pressed={!trainerCollapsed}
                title={trainerCollapsed ? 'Show Lesson panel' : 'Hide Lesson panel'}
              >
                <PanelIcon variant="middle" />
              </button>
            )}
            <button
              type="button"
              className={`tb-icon-btn ${!simulatorCollapsed ? 'is-on' : ''}`}
              onClick={toggleSimulator}
              aria-pressed={!simulatorCollapsed}
              title={simulatorCollapsed ? 'Show HTTP panel' : 'Hide HTTP panel'}
            >
              <PanelIcon variant="bottom" />
            </button>
          </div>

          <button
            type="button"
            className={`tb-expand ${stepsDone > 0 ? 'is-on' : ''}`}
            onClick={cycleCodeExpandStep}
            title={expandTitle}
            aria-label={expandTitle}
          >
            {allExpanded ? <RestoreIcon /> : <MaximizeIcon />}
            <span className="tb-steps" aria-hidden="true">
              {stepFlags.map((_, i) => (
                <i key={i} className={i < stepsDone ? 'on' : ''} />
              ))}
            </span>
          </button>

          <span className="tb-divider" aria-hidden="true" />

          <span
            className="save-status"
            title={`${modeLabel} — edits auto-save to localStorage`}
          >
            <i aria-hidden="true" />
            {lastSavedAt ? `Saved ${lastSavedAt}` : 'Auto-save on'}
          </span>

          <button
            type="button"
            className="btn btn-success btn-xs"
            title="Run automated exercise tests (Ctrl+Shift+Enter)"
            onClick={onVerifyExercise}
          >
            ✓ Verify
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div
          ref={monacoMountRef}
          className="monaco-mount"
          style={{ visibility: monacoReady ? 'visible' : 'hidden' }}
        />
        {!monacoReady && (
          <textarea
            className="fallback-editor"
            spellCheck={false}
            aria-label="TypeScript Code Editor"
            value={activeFile.code}
            onChange={(e) => updateActiveFileCode(e.target.value, defaultFiles)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const nextCode =
                  activeFile.code.substring(0, start) + '  ' + activeFile.code.substring(end);
                updateActiveFileCode(nextCode, defaultFiles);
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
