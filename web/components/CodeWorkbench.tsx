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

export function CodeWorkbench({
  defaultFiles,
  modeLabel,
  onSendRequest,
  onVerifyExercise,
}: CodeWorkbenchProps) {
  const activeFileIndex = useStudioStore((s) => s.activeFileIndex);
  const setActiveFileIndex = useStudioStore((s) => s.setActiveFileIndex);
  const getCurrentFiles = useStudioStore((s) => s.getCurrentFiles);
  const updateActiveFileCode = useStudioStore((s) => s.updateActiveFileCode);
  const lastSavedAt = useStudioStore((s) => s.lastSavedAt);
  const editorHeightPercent = useStudioStore((s) => s.editorHeightPercent);

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
    <div className="editor-section" style={{ height: `${editorHeightPercent}%` }}>
      <div className="editor-tabbar">
        <div className="file-tabs">
          {files.map((f, idx) => {
            const hasTodo = f.code?.includes('// TODO');
            return (
              <button
                key={f.name + idx}
                type="button"
                className={`file-tab ${idx === activeFileIndex ? 'active' : ''}`}
                onClick={() => setActiveFileIndex(idx)}
                title={
                  hasTodo
                    ? `${f.name} — Contains exercise // TODO items`
                    : `${f.name} (${files.length} files in lesson workspace)`
                }
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>{getFileRoleIcon(f.name)}</span>
                  <span>{f.name}</span>
                  {hasTodo && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 999,
                        background: 'rgba(245, 158, 11, 0.18)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        letterSpacing: '0.03em',
                      }}
                    >
                      TODO
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="editor-actions">
          <span
            className="code-mode-pill"
            title="All file edits are persisted automatically in localStorage"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
                display: 'inline-block',
              }}
            />
            {modeLabel} {lastSavedAt ? `• Saved ${lastSavedAt}` : '• Auto-Save On'}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-xs"
            title="Send HTTP Request (Ctrl+Enter)"
            onClick={onSendRequest}
          >
            ▶ Send Request
          </button>
          <button
            type="button"
            className="btn btn-success btn-xs"
            title="Run Automated Exercise Tests (Ctrl+Shift+Enter)"
            onClick={onVerifyExercise}
          >
            ✓ Verify Exercise
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
