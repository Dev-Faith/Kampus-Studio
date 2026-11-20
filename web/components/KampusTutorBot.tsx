'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  FileCode2,
  GripVertical,
  KeyRound,
  MapPin,
  PanelRight,
  PanelRightClose,
  PanelRightOpen,
  PictureInPicture2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { FileEntry, Subconcept } from '../types/studio';

interface KampusTutorBotProps {
  activeSubconcept?: Subconcept;
  currentFiles: FileEntry[];
}

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  source?: string;
  contextLabel?: string;
  timestamp: string;
}

function formatTutorMarkdown(md: string): string {
  if (!md) return '';

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const codeBlocks: string[] = [];
  const withPlaceholders = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  const lines = withPlaceholders.split('\n');
  const htmlLines: string[] = [];
  let inList = false;

  const formatInline = (text: string) => {
    let out = escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return out;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      continue;
    }

    if (line.startsWith('@@CODEBLOCK_')) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      const match = line.match(/@@CODEBLOCK_(\d+)@@/);
      if (match) {
        htmlLines.push(codeBlocks[Number(match[1])] || '');
      }
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push('<hr />');
      continue;
    }

    if (line.startsWith('#### ')) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h4>${formatInline(line.slice(5))}</h4>`);
      continue;
    }

    if (line.startsWith('### ')) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h3>${formatInline(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      htmlLines.push(`<h3>${formatInline(line.slice(3))}</h3>`);
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line)) {
      if (!inList) {
        htmlLines.push('<ul>');
        inList = true;
      }
      const itemText = line.replace(/^(-|\*|\d+\.)\s+/, '');
      htmlLines.push(`<li>${formatInline(itemText)}</li>`);
      continue;
    }

    if (inList) {
      htmlLines.push('</ul>');
      inList = false;
    }
    htmlLines.push(`<p>${formatInline(line)}</p>`);
  }

  if (inList) {
    htmlLines.push('</ul>');
  }

  return htmlLines.join('\n');
}

function stripLeadingEmoji(text: string): string {
  return text.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim();
}

const ENV_GEMINI_KEY = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

export function KampusTutorBot({ activeSubconcept, currentFiles }: KampusTutorBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKeyBar, setShowApiKeyBar] = useState(false);
  const [apiKey, setApiKey] = useState(ENV_GEMINI_KEY);
  const [usingEnvKey, setUsingEnvKey] = useState(Boolean(ENV_GEMINI_KEY));
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [isDetached, setIsDetached] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dockedWidth, setDockedWidth] = useState(440);
  const [floatPos, setFloatPos] = useState({ x: 80, y: 68 });
  const [floatSize, setFloatSize] = useState({ width: 440, height: 600 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  const mode = useStudioStore((s) => s.mode);
  const trainerTab = useStudioStore((s) => s.trainerTab);
  const activeFileIndex = useStudioStore((s) => s.activeFileIndex);
  const lastExecutionResult = useStudioStore((s) => s.lastExecutionResult);
  const testResults = useStudioStore((s) => s.testResults);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = (window.localStorage.getItem('kampus_gemini_api_key') || '').trim();
      if (savedKey) {
        setApiKey(savedKey);
        setUsingEnvKey(false);
      } else if (ENV_GEMINI_KEY) {
        setApiKey(ENV_GEMINI_KEY);
        setUsingEnvKey(true);
      } else {
        fetch('/api/tutor')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.configured) {
              setUsingEnvKey(true);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleSaveApiKey = (val: string) => {
    const trimmed = val.trim();
    if (typeof window !== 'undefined') {
      if (trimmed && trimmed !== ENV_GEMINI_KEY) {
        window.localStorage.setItem('kampus_gemini_api_key', trimmed);
        setApiKey(val);
        setUsingEnvKey(false);
      } else {
        window.localStorage.removeItem('kampus_gemini_api_key');
        setApiKey(ENV_GEMINI_KEY);
        setUsingEnvKey(Boolean(ENV_GEMINI_KEY));
      }
    }
  };

  const tutorContext = useMemo(() => {
    return {
      mode,
      trainerTab,
      subconcept: activeSubconcept || null,
      currentFiles,
      activeFileIndex,
      lastExecutionResult,
      testResults,
    };
  }, [
    mode,
    trainerTab,
    activeSubconcept,
    currentFiles,
    activeFileIndex,
    lastExecutionResult,
    testResults,
  ]);

  const contextBadgeText = useMemo(() => {
    if (mode === 'prisma') return 'Prisma ORM';
    if (mode === 'mongoose') return 'Mongoose ODM';
    if (mode === 'testing') return 'Testing Mastery';
    if (mode === 'syntax') return 'JS ↔ NestJS';
    if (mode === 'sandbox') return 'Free Sandbox';
    if (mode === 'cheatsheet') return 'Architecture';
    if (activeSubconcept) return `${activeSubconcept.code} · ${activeSubconcept.title}`;
    return 'Kampus Lesson';
  }, [mode, activeSubconcept]);

  const suggestedChips = useMemo(() => {
    if (typeof window !== 'undefined' && window.KampusAiTutor) {
      return window.KampusAiTutor.getSuggestedQuestions(tutorContext);
    }
    return [
      'How do the open files in this lesson connect?',
      'Why is this lesson built this way?',
      'Debug my current code & tests',
      'Explain every decorator in my editor',
    ];
  }, [tutorContext]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleAskQuestion = async (rawQuestion: string) => {
    const q = rawQuestion.trim();
    if (!q || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: stripLeadingEmoji(q),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsThinking(true);

    try {
      let answerText = '';
      let source = 'built-in';

      if (typeof window !== 'undefined' && window.KampusAiTutor) {
        const res = await window.KampusAiTutor.askTutor(q, tutorContext, apiKey, messages);
        answerText = res.answer;
        source = res.source;
      } else {
        answerText = 'Kampus Tutor engine is still loading. Please try again in a moment.';
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: answerText,
        source,
        contextLabel:
          mode === 'trainer' && activeSubconcept
            ? `${activeSubconcept.code} · ${trainerTab === 'exercise' ? 'Exercise' : 'Concept'}`
            : contextBadgeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const activeFile = currentFiles[activeFileIndex] || currentFiles[0];
  const passedTestsCount = testResults ? testResults.filter((t) => t.pass).length : 0;
  const aiLive = Boolean(apiKey.trim()) || usingEnvKey;
  const hasConversation = messages.length > 0;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputText, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
    } catch {
      // Ignore clipboard unavailability
    }
  };

  // Load saved detached floating window position & size
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('kampus_tutor_win_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.isDetached === 'boolean') setIsDetached(parsed.isDetached);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(12, window.innerWidth - (parsed.width || 440) - 12);
          const maxY = Math.max(56, window.innerHeight - 160);
          setFloatPos({
            x: Math.min(Math.max(12, parsed.x), maxX),
            y: Math.min(Math.max(56, parsed.y), maxY),
          });
        }
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
          setFloatSize({
            width: Math.min(Math.max(340, parsed.width), window.innerWidth - 24),
            height: Math.min(Math.max(360, parsed.height), window.innerHeight - 72),
          });
        }
      } else {
        setFloatPos({
          x: Math.max(16, window.innerWidth - 468),
          y: 66,
        });
      }
    } catch {
      // Ignore corrupted layout storage
    }
  }, []);

  // Persist detached window geometry
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'kampus_tutor_win_v1',
        JSON.stringify({
          isDetached,
          x: floatPos.x,
          y: floatPos.y,
          width: floatSize.width,
          height: floatSize.height,
        }),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [isDetached, floatPos.x, floatPos.y, floatSize.width, floatSize.height]);

  // Keep detached window clamped inside viewport when browser resizes
  useEffect(() => {
    if (!isDetached) return;
    const onResize = () => {
      setFloatPos((prev) => ({
        x: Math.min(Math.max(12, prev.x), Math.max(12, window.innerWidth - floatSize.width - 12)),
        y: Math.min(Math.max(54, prev.y), Math.max(54, window.innerHeight - 120)),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isDetached, floatSize.width]);

  const handleToggleDetach = () => {
    if (!isDetached && typeof window !== 'undefined') {
      const targetW = isWide ? Math.min(640, window.innerWidth - 32) : 440;
      const targetH = Math.min(620, window.innerHeight - 88);
      setFloatSize({ width: targetW, height: targetH });
      setFloatPos({
        x: Math.max(16, window.innerWidth - targetW - 24),
        y: 66,
      });
      setIsDetached(true);
    } else {
      setIsDetached(false);
    }
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // Do not start dragging when clicking header action buttons
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;

    const rect = drawerRef.current?.getBoundingClientRect();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const initialX = isDetached ? floatPos.x : rect ? rect.left : Math.max(16, window.innerWidth - 460);
    const initialY = isDetached ? floatPos.y : rect ? Math.max(56, rect.top) : 64;
    const activeW = isDetached ? floatSize.width : rect ? rect.width : 440;
    const activeH = isDetached ? floatSize.height : Math.min(620, window.innerHeight - 88);

    let detachedNow = isDetached;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;

      // Auto-detach smoothly if user drags the docked header by more than 6px
      if (!detachedNow && Math.hypot(dx, dy) > 6) {
        detachedNow = true;
        setIsDetached(true);
        setFloatSize({ width: activeW, height: activeH });
        setIsDragging(true);
      }
      if (!detachedNow) return;

      setIsDragging(true);
      const nextX = Math.min(
        Math.max(8, initialX + dx),
        Math.max(8, window.innerWidth - activeW - 8),
      );
      const nextY = Math.min(
        Math.max(52, initialY + dy),
        Math.max(52, window.innerHeight - 64),
      );
      setFloatPos({ x: Math.round(nextX), y: Math.round(nextY) });
    };

    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  type ResizeDir = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

  const handleResizePointerDown = (dir: ResizeDir) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const rect = drawerRef.current?.getBoundingClientRect();
    const startX = isDetached ? floatPos.x : rect ? rect.left : window.innerWidth - dockedWidth;
    const startY = isDetached ? floatPos.y : rect ? rect.top : 48;
    const startW = isDetached ? floatSize.width : rect ? rect.width : dockedWidth;
    const startH = isDetached ? floatSize.height : rect ? rect.height : 600;
    const minW = 340;
    const minH = 340;
    const maxW = Math.min(920, window.innerWidth - 20);
    const maxH = window.innerHeight - 60;

    setIsResizing(true);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startMouseX;
      const dy = ev.clientY - startMouseY;

      if (!isDetached) {
        // Resizing the docked right panel via its left edge
        const nextW = Math.round(Math.min(Math.max(minW, startW - dx), maxW));
        setDockedWidth(nextW);
        return;
      }

      let nextX = startX;
      let nextY = startY;
      let nextW = startW;
      let nextH = startH;

      if (dir.includes('e')) {
        const availW = Math.min(maxW, window.innerWidth - startX - 8);
        nextW = Math.min(Math.max(minW, startW + dx), availW);
      }
      if (dir.includes('w')) {
        const rightEdge = startX + startW;
        const clampedX = Math.min(Math.max(8, startX + dx), rightEdge - minW);
        const clampedW = Math.min(maxW, rightEdge - clampedX);
        nextX = rightEdge - clampedW;
        nextW = clampedW;
      }
      if (dir.includes('s')) {
        const availH = Math.min(maxH, window.innerHeight - startY - 8);
        nextH = Math.min(Math.max(minH, startH + dy), availH);
      }
      if (dir.includes('n')) {
        const bottomEdge = startY + startH;
        const clampedY = Math.min(Math.max(52, startY + dy), bottomEdge - minH);
        const clampedH = Math.min(maxH, bottomEdge - clampedY);
        nextY = bottomEdge - clampedH;
        nextH = clampedH;
      }

      setFloatPos({ x: Math.round(nextX), y: Math.round(nextY) });
      setFloatSize({ width: Math.round(nextW), height: Math.round(nextH) });
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <>
      <motion.button
        type="button"
        className="tutor-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 450, damping: 24 }}
        title="Ask Kampus Tutor"
        aria-label="Open Kampus AI Tutor"
        aria-expanded={isOpen}
      >
        <span className="tutor-fab-icon">
          <Sparkles size={18} strokeWidth={2} />
        </span>
        <span className="tutor-fab-tooltip">Ask Kampus Tutor</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            ref={drawerRef}
            className={`tutor-drawer ${isWide && !isDetached ? 'wide' : ''} ${isDetached ? 'detached' : ''} ${isDragging || isResizing ? 'interacting' : ''}`}
            style={
              isDetached
                ? {
                    left: floatPos.x,
                    top: floatPos.y,
                    right: 'auto',
                    bottom: 'auto',
                    width: floatSize.width,
                    height: floatSize.height,
                  }
                : {
                    width: isWide ? Math.max(dockedWidth, 660) : dockedWidth,
                  }
            }
            aria-label="Kampus AI Tutor"
            initial={isDetached ? { scale: 0.96, opacity: 0 } : { x: 40, opacity: 0 }}
            animate={isDetached ? { scale: 1, opacity: 1 } : { x: 0, opacity: 1 }}
            exit={isDetached ? { scale: 0.96, opacity: 0 } : { x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <header
              className={`tutor-header ${isDragging ? 'dragging' : ''}`}
              onPointerDown={handleHeaderPointerDown}
              onDoubleClick={handleToggleDetach}
              title={
                isDetached
                  ? 'Drag to move · Double-click to snap back to dock'
                  : 'Drag to detach into a movable window · Double-click to float'
              }
            >
              <div className="tutor-header-left">
                <span className="tutor-drag-grip" aria-hidden="true">
                  <GripVertical size={14} strokeWidth={1.8} />
                </span>
                <div className="tutor-avatar">
                  <Sparkles size={15} strokeWidth={2} />
                </div>
                <div className="tutor-heading">
                  <div className="tutor-title">Kampus Tutor</div>
                  <div className="tutor-status">
                    <i className={aiLive ? 'live' : ''} />
                    {aiLive ? 'Gemini · Live AI' : 'Offline · Built-in Engine'}
                  </div>
                </div>
              </div>
              <div className="tutor-header-actions">
                <button
                  type="button"
                  className="tutor-icon-btn"
                  onClick={handleToggleDetach}
                  aria-pressed={isDetached}
                  title={isDetached ? 'Dock to right panel' : 'Detach into movable floating window'}
                  aria-label={isDetached ? 'Dock chat panel' : 'Detach chat window'}
                >
                  {isDetached ? (
                    <PanelRight size={14} strokeWidth={1.9} />
                  ) : (
                    <PictureInPicture2 size={14} strokeWidth={1.9} />
                  )}
                </button>
                <button
                  type="button"
                  className="tutor-icon-btn"
                  onClick={() => setShowApiKeyBar((v) => !v)}
                  aria-pressed={showApiKeyBar}
                  title={usingEnvKey ? 'Using GEMINI_API_KEY from .env' : 'Configure API Key'}
                  aria-label="API key settings"
                >
                  <KeyRound size={14} strokeWidth={1.9} />
                </button>
                {!isDetached && (
                  <button
                    type="button"
                    className="tutor-icon-btn"
                    onClick={() => setIsWide((v) => !v)}
                    aria-pressed={isWide}
                    title={isWide ? 'Compact width' : 'Wide reading view'}
                    aria-label="Toggle wide view"
                  >
                    {isWide ? (
                      <PanelRightClose size={14} strokeWidth={1.9} />
                    ) : (
                      <PanelRightOpen size={14} strokeWidth={1.9} />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="tutor-icon-btn"
                  onClick={() => setMessages([])}
                  disabled={!hasConversation}
                  title="New chat"
                  aria-label="New chat"
                >
                  <RotateCcw size={14} strokeWidth={1.9} />
                </button>
                <button
                  type="button"
                  className="tutor-icon-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close (Esc)"
                  aria-label="Close tutor"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            </header>

            <div className="tutor-context-bar" aria-label="Context the tutor can see">
              <span className="tutor-ctx-pill active" title={activeSubconcept?.title || contextBadgeText}>
                <MapPin size={11} strokeWidth={2} />
                <span className="tutor-ctx-text">
                  {mode === 'trainer' && activeSubconcept
                    ? `${activeSubconcept.code} ${activeSubconcept.title}`
                    : contextBadgeText}
                </span>
              </span>
              {mode === 'trainer' && (
                <span className="tutor-ctx-pill">
                  {trainerTab === 'exercise' ? 'Exercise' : 'Concept'}
                </span>
              )}
              {activeFile && (mode === 'trainer' || mode === 'sandbox') && (
                <span className="tutor-ctx-pill" title={activeFile.name}>
                  <FileCode2 size={11} strokeWidth={2} />
                  <span className="tutor-ctx-text">{activeFile.name}</span>
                </span>
              )}
              {lastExecutionResult && (mode === 'trainer' || mode === 'sandbox') && (
                <span
                  className={`tutor-ctx-pill ${lastExecutionResult.status >= 400 ? 'warn' : 'ok'}`}
                >
                  HTTP {lastExecutionResult.status}
                </span>
              )}
              {testResults && testResults.length > 0 && (
                <span
                  className={`tutor-ctx-pill ${passedTestsCount === testResults.length ? 'ok' : 'warn'}`}
                >
                  {passedTestsCount}/{testResults.length} tests
                </span>
              )}
            </div>

            {showApiKeyBar && (
              <div className="tutor-apikey-bar">
                {usingEnvKey && <span className="tutor-apikey-note">Connected (.env)</span>}
                <input
                  type="password"
                  className="tutor-apikey-input"
                  placeholder={
                    usingEnvKey
                      ? 'Paste a key to override .env'
                      : 'Gemini (AIza...), Groq (gsk_...) or OpenAI (sk-...) key'
                  }
                  value={usingEnvKey ? '' : apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                />
                {!usingEnvKey && apiKey.trim() && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleSaveApiKey('')}
                  >
                    {ENV_GEMINI_KEY ? 'Use .env' : 'Clear'}
                  </button>
                )}
              </div>
            )}

            <div className="tutor-messages">
              {!hasConversation && (
                <div className="tutor-empty">
                  <div className="tutor-empty-icon">
                    <Sparkles size={19} strokeWidth={2} />
                  </div>
                  <h2>Ask about anything on screen</h2>
                  <p>
                    Reads your active lesson, open TypeScript tabs, HTTP response trace, and failing
                    assertions.
                  </p>
                  <div className="tutor-suggest-grid">
                    {suggestedChips.slice(0, 5).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        className="tutor-suggest"
                        onClick={() => void handleAskQuestion(chip)}
                      >
                        <span className="tutor-suggest-text">{stripLeadingEmoji(chip)}</span>
                        <ArrowUpRight
                          size={13}
                          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <motion.div
                    key={msg.id}
                    className="tutor-msg user"
                    title={msg.timestamp}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16 }}
                  >
                    <div className="tutor-msg-bubble">{msg.content}</div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={msg.id}
                    className="tutor-msg assistant"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="tutor-msg-avatar" aria-hidden="true">
                      <Sparkles size={12} strokeWidth={2.2} />
                    </div>
                    <div className="tutor-msg-main">
                      <div className="tutor-msg-meta">
                        <span className="tutor-msg-author">Kampus Tutor</span>
                        <span
                          className={`tutor-source ${msg.source === 'gemini-api' ? 'ai' : 'local'}`}
                        >
                          {msg.source === 'gemini-api' ? 'Gemini' : 'Built-in'}
                        </span>
                        <span className="tutor-msg-time">
                          {msg.contextLabel ? `${msg.contextLabel} · ` : ''}
                          {msg.timestamp}
                        </span>
                      </div>
                      <div
                        className="tutor-msg-body"
                        dangerouslySetInnerHTML={{ __html: formatTutorMarkdown(msg.content) }}
                      />
                      <div className="tutor-msg-actions">
                        <button
                          type="button"
                          className="tutor-action-btn"
                          onClick={() => void handleCopy(msg.id, msg.content)}
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={11} /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={11} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ),
              )}

              {isThinking && (
                <div className="tutor-msg assistant">
                  <div className="tutor-msg-avatar" aria-hidden="true">
                    <Sparkles size={12} strokeWidth={2.2} />
                  </div>
                  <div className="tutor-typing" role="status" aria-live="polite">
                    <span className="tutor-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    Inspecting your open files…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {hasConversation && (
              <div className="tutor-quick-row" aria-label="Suggested questions">
                {suggestedChips.slice(0, 5).map((chip) => {
                  const clean = stripLeadingEmoji(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      className="tutor-chip"
                      title={clean}
                      onClick={() => void handleAskQuestion(chip)}
                    >
                      {clean}
                    </button>
                  );
                })}
              </div>
            )}

            <form
              className="tutor-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void handleAskQuestion(inputText);
              }}
            >
              <div className="tutor-composer-box">
                <textarea
                  ref={textareaRef}
                  className="tutor-input"
                  rows={1}
                  placeholder="Ask about this lesson, a decorator, or your open files..."
                  aria-label="Ask the Kampus Tutor"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleAskQuestion(inputText);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="tutor-send"
                  disabled={!inputText.trim() || isThinking}
                  aria-label="Send question"
                  title="Send (Enter)"
                >
                  <ArrowUp size={15} strokeWidth={2.2} />
                </button>
              </div>
              <div className="tutor-hint">
                <kbd>Enter</kbd> send · <kbd>Shift</kbd>+<kbd>Enter</kbd> newline
              </div>
            </form>

            {/* Docked mode: full-height left-edge width resizer */}
            {!isDetached && (
              <div
                className="tutor-resize-edge tutor-resize-w"
                onPointerDown={handleResizePointerDown('w')}
                title="Drag left/right to resize Tutor width"
              />
            )}

            {/* Detached mode: full 8-direction OS-style window resizers (4 edges + 4 corners) */}
            {isDetached && (
              <>
                <div className="tutor-resize-edge tutor-resize-n" onPointerDown={handleResizePointerDown('n')} />
                <div className="tutor-resize-edge tutor-resize-s" onPointerDown={handleResizePointerDown('s')} />
                <div className="tutor-resize-edge tutor-resize-e" onPointerDown={handleResizePointerDown('e')} />
                <div className="tutor-resize-edge tutor-resize-w" onPointerDown={handleResizePointerDown('w')} />
                <div className="tutor-resize-corner tutor-resize-nw" onPointerDown={handleResizePointerDown('nw')} />
                <div className="tutor-resize-corner tutor-resize-ne" onPointerDown={handleResizePointerDown('ne')} />
                <div className="tutor-resize-corner tutor-resize-sw" onPointerDown={handleResizePointerDown('sw')} />
                <div
                  className="tutor-resize-corner tutor-resize-se"
                  onPointerDown={handleResizePointerDown('se')}
                  title="Drag any edge or corner to resize"
                  aria-label="Resize floating chat window"
                />
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
