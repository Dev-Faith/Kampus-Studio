'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  Cog,
  Database,
  FileCode2,
  Filter,
  FlaskConical,
  Link2,
  Maximize2,
  Minimize2,
  Radio,
  Repeat,
  Shield,
  Sliders,
  Tag,
  Target,
  Warehouse,
} from 'lucide-react';
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
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.25" />
      {variant === 'left' && <rect x="2.2" y="3.2" width="3.5" height="9.6" rx="0.8" fill="currentColor" />}
      {variant === 'middle' && <rect x="5.4" y="3.2" width="4.2" height="9.6" fill="currentColor" opacity="0.9" />}
      {variant === 'bottom' && <rect x="2.2" y="9" width="11.6" height="3.8" rx="0.8" fill="currentColor" />}
    </svg>
  );
}

function registerKampusMonacoThemes(monaco: any) {
  if (!monaco?.editor?.defineTheme) return;

  monaco.editor.defineTheme('kampus-atelier', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B6E7B', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C4A7E7' },
      { token: 'keyword.control', foreground: 'C4A7E7' },
      { token: 'keyword.operator', foreground: 'F28B7D' },
      { token: 'decorator', foreground: 'F5C26B' },
      { token: 'annotation', foreground: 'F5C26B' },
      { token: 'metatag', foreground: 'F5C26B' },
      { token: 'string', foreground: '86EFAC' },
      { token: 'string.escape', foreground: 'F5C26B' },
      { token: 'number', foreground: 'FDBA74' },
      { token: 'regexp', foreground: 'F5C26B' },
      { token: 'type', foreground: '7DD3FC' },
      { token: 'type.identifier', foreground: '7DD3FC' },
      { token: 'identifier', foreground: 'EDEDEF' },
      { token: 'delimiter', foreground: '8E909E' },
      { token: 'delimiter.bracket', foreground: 'A1A1AA' },
    ],
    colors: {
      'editor.background': '#09090B',
      'editor.foreground': '#EDEDEF',
      'editor.lineHighlightBackground': '#141419',
      'editor.lineHighlightBorder': '#1E1E26',
      'editor.selectionBackground': '#E8503A2E',
      'editor.inactiveSelectionBackground': '#27272D88',
      'editorLineNumber.foreground': '#45454F',
      'editorLineNumber.activeForeground': '#E8503A',
      'editorCursor.foreground': '#E8503A',
      'editorIndentGuide.background': '#191920',
      'editorIndentGuide.activeBackground': '#343440',
      'editorGutter.background': '#09090B',
      'editorWidget.background': '#16161C',
      'editorWidget.border': '#2A2A34',
      'editorBracketHighlight.foreground1': '#F5C26B',
      'editorBracketHighlight.foreground2': '#C4A7E7',
      'editorBracketHighlight.foreground3': '#7DD3FC',
    },
  });

  monaco.editor.defineTheme('kampus-vellum', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8A8A93', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7C3AED' },
      { token: 'decorator', foreground: 'B45309' },
      { token: 'string', foreground: '15803D' },
      { token: 'number', foreground: 'C2410C' },
      { token: 'type', foreground: '0369A1' },
      { token: 'type.identifier', foreground: '0369A1' },
      { token: 'identifier', foreground: '18181B' },
      { token: 'delimiter', foreground: '71717A' },
    ],
    colors: {
      'editor.background': '#F5F4F0',
      'editor.foreground': '#18181B',
      'editor.lineHighlightBackground': '#ECEAE3',
      'editor.selectionBackground': '#D4422C24',
      'editorLineNumber.foreground': '#A1A1AA',
      'editorLineNumber.activeForeground': '#D4422C',
      'editorCursor.foreground': '#D4422C',
      'editorIndentGuide.background': '#E5E3DC',
      'editorGutter.background': '#F5F4F0',
    },
  });
}

function getFileRoleIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  const s = 13;
  if (lower.endsWith('.spec.ts') || lower.endsWith('.test.ts'))
    return <CheckCircle2 size={s} style={{ color: 'var(--green-fg)' }} />;
  if (lower.endsWith('.controller.ts'))
    return <Target size={s} style={{ color: 'var(--accent-fg)' }} />;
  if (lower.endsWith('.service.ts'))
    return <Cog size={s} style={{ color: 'var(--blue-fg)' }} />;
  if (lower.endsWith('.module.ts'))
    return <Warehouse size={s} style={{ color: 'var(--amber-fg)' }} />;
  if (lower.endsWith('.dto.ts'))
    return <Box size={s} style={{ color: 'var(--green-fg)' }} />;
  if (lower.endsWith('.guard.ts'))
    return <Shield size={s} style={{ color: 'var(--amber-fg)' }} />;
  if (lower.endsWith('.interceptor.ts'))
    return <Repeat size={s} style={{ color: 'var(--violet-fg)' }} />;
  if (lower.endsWith('.pipe.ts'))
    return <Filter size={s} style={{ color: 'var(--blue-fg)' }} />;
  if (lower.endsWith('.filter.ts') || lower.endsWith('.exception.ts'))
    return <AlertTriangle size={s} style={{ color: 'var(--red-fg)' }} />;
  if (lower.endsWith('.config.ts'))
    return <Sliders size={s} style={{ color: 'var(--violet-fg)' }} />;
  if (lower.endsWith('.decorator.ts'))
    return <Tag size={s} style={{ color: 'var(--amber-fg)' }} />;
  if (lower.endsWith('.middleware.ts'))
    return <Link2 size={s} style={{ color: 'var(--text-secondary)' }} />;
  if (lower.endsWith('.listener.ts') || lower.endsWith('.event.ts'))
    return <Radio size={s} style={{ color: 'var(--green-fg)' }} />;
  if (lower.endsWith('.schema.ts') || lower.endsWith('.prisma'))
    return <Database size={s} style={{ color: 'var(--blue-fg)' }} />;
  if (lower.includes('sandbox'))
    return <FlaskConical size={s} style={{ color: 'var(--accent-fg)' }} />;
  return <FileCode2 size={s} style={{ color: 'var(--text-muted)' }} />;
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
  const theme = useStudioStore((s) => s.theme);
  const sidebarCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const trainerCollapsed = useStudioStore((s) => s.trainerCollapsed);
  const simulatorCollapsed = useStudioStore((s) => s.simulatorCollapsed);
  const toggleSidebar = useStudioStore((s) => s.toggleSidebar);
  const toggleTrainer = useStudioStore((s) => s.toggleTrainer);
  const toggleSimulator = useStudioStore((s) => s.toggleSimulator);
  const toggleFocusMode = useStudioStore((s) => s.toggleFocusMode);
  const sidebarWidth = useStudioStore((s) => s.sidebarWidth);
  const trainerPaneWidth = useStudioStore((s) => s.trainerPaneWidth);

  const files = getCurrentFiles(defaultFiles);
  const activeFile = files[activeFileIndex] || files[0] || { name: 'main.ts', code: '' };

  const monacoMountRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const [monacoReady, setMonacoReady] = useState(false);

  const latestCodeRef = useRef<string>(activeFile.code);
  latestCodeRef.current = activeFile.code;
  const themeRef = useRef<'dark' | 'light'>(theme);
  themeRef.current = theme;

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

      registerKampusMonacoThemes(monaco);

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
        theme: themeRef.current === 'light' ? 'kampus-vellum' : 'kampus-atelier',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 22,
        fontLigatures: true,
        fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
        padding: { top: 14, bottom: 18 },
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, highlightActiveIndentation: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
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

  // Sync live theme to Monaco
  useEffect(() => {
    if (typeof window !== 'undefined' && window.monaco?.editor?.setTheme) {
      window.monaco.editor.setTheme(theme === 'light' ? 'kampus-vellum' : 'kampus-atelier');
    }
  }, [theme, monacoReady]);

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

  const isTrainerMode = mode === 'trainer';
  const focusActive =
    sidebarCollapsed && simulatorCollapsed && (!isTrainerMode || trainerCollapsed);
  const expandTitle = focusActive
    ? 'Exit fullscreen — restore all panels'
    : 'Fullscreen editor — hide all panels';

  return (
    <div
      className="editor-section"
      style={{ height: simulatorCollapsed ? '100%' : `${editorHeightPercent}%` }}
    >
      <div className="editor-tabbar">
        <div className="file-tabs" role="tablist" aria-label="Open files">
          {files.map((f, idx) => {
            const hasTodo = f.code?.includes('// TODO');
            const isActive = idx === activeFileIndex;
            return (
              <button
                key={f.name + idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`file-tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveFileIndex(idx)}
                title={
                  hasTodo
                    ? `${f.name} — contains exercise // TODO items`
                    : `${f.name} (${files.length} files in this workspace)`
                }
              >
                {isActive && (
                  <motion.span
                    layoutId="file-tab-indicator"
                    className="file-tab-underline"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
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
            className={`tb-expand ${focusActive ? 'is-on' : ''}`}
            onClick={toggleFocusMode}
            aria-pressed={focusActive}
            title={expandTitle}
            aria-label={expandTitle}
          >
            {focusActive ? <Minimize2 size={13} strokeWidth={2} /> : <Maximize2 size={13} strokeWidth={2} />}
            <span className="tb-expand-label">{focusActive ? 'Exit' : 'Fullscreen'}</span>
          </button>

          <span className="tb-divider" aria-hidden="true" />

          <span
            className="save-status"
            title={
              lastSavedAt
                ? `${modeLabel} — Saved at ${lastSavedAt} in localStorage`
                : `${modeLabel} — Edits auto-save to localStorage`
            }
          >
            <i aria-hidden="true" />
            Saved
          </span>

          <button
            type="button"
            className="btn btn-verify btn-xs"
            title="Run automated exercise tests (Ctrl+Shift+Enter)"
            onClick={onVerifyExercise}
          >
            <CheckCircle2 size={13} strokeWidth={2.2} />
            Verify
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
