'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Lightweight, safe Markdown-to-HTML formatter for Tutor answers.
 * Supports fenced code blocks, inline code, bold text, headings, and bullet lists.
 */
function formatTutorMarkdown(md: string): string {
  if (!md) return '';

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  // Extract fenced code blocks first so their contents aren't altered
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

const ENV_GEMINI_KEY = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

export function KampusTutorBot({ activeSubconcept, currentFiles }: KampusTutorBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKeyBar, setShowApiKeyBar] = useState(false);
  const [apiKey, setApiKey] = useState(ENV_GEMINI_KEY);
  const [usingEnvKey, setUsingEnvKey] = useState(Boolean(ENV_GEMINI_KEY));
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const mode = useStudioStore((s) => s.mode);
  const trainerTab = useStudioStore((s) => s.trainerTab);
  const activeFileIndex = useStudioStore((s) => s.activeFileIndex);
  const lastExecutionResult = useStudioStore((s) => s.lastExecutionResult);
  const testResults = useStudioStore((s) => s.testResults);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load saved Gemini API key from localStorage if present, otherwise use GEMINI_API_KEY from .env
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
        fetch('/api/v1/sandbox/tutor-config')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.geminiApiKey) {
              setApiKey(String(data.geminiApiKey).trim());
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

  // Build live TutorContext object
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

  // Context badge for button & status pills
  const contextBadgeText = useMemo(() => {
    if (mode === 'prisma') return '💎 Prisma ORM';
    if (mode === 'mongoose') return '🍃 Mongoose ODM';
    if (mode === 'syntax') return '🧬 Syntax Rosetta';
    if (mode === 'sandbox') return '🧪 Free Sandbox';
    if (mode === 'cheatsheet') return '🗺️ Cheat Sheet';
    if (activeSubconcept) return `${activeSubconcept.code} · ${activeSubconcept.title.split(' ')[0]}`;
    return 'Kampus Lesson';
  }, [mode, activeSubconcept]);

  // Suggested questions for current context
  const suggestedChips = useMemo(() => {
    if (typeof window !== 'undefined' && window.KampusAiTutor) {
      return window.KampusAiTutor.getSuggestedQuestions(tutorContext);
    }
    return [
      '🏗️ Why is this lesson built this way?',
      '🔍 Debug my current code & tests',
      '🧬 Explain every decorator in my editor',
      '💡 Give me a hint for the exercise',
    ];
  }, [tutorContext]);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-msg',
      role: 'assistant',
      source: 'built-in',
      contextLabel: 'Kampus Tutor Ready',
      timestamp: 'Just now',
      content:
        '### 👋 Hi! I am your Context-Aware Kampus Backend Tutor.\n\n' +
        'I can see the **exact lesson** you are studying, your **live TypeScript code in the editor**, your **last HTTP response**, and any **failing exercise test assertions**.\n\n' +
        '- Click **"🏗️ Why is this lesson built this way?"** to understand the architectural trade-offs.\n' +
        '- Click **"🔍 Debug my current code & tests"** if your exercise or endpoint isn\'t passing.\n' +
        '- Or type any specific question about **NestJS**, **Prisma**, **Mongoose**, or **TypeScript** below!',
    },
  ]);

  // Auto-scroll to bottom when new messages arrive
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
      content: q,
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

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        className="tutor-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Open Context-Aware Kampus AI Tutor & Code Diagnostic Bot"
      >
        <span className="tutor-fab-icon">🤖</span>
        <span>Ask Kampus Tutor</span>
        <span className="tutor-fab-badge">{contextBadgeText}</span>
      </button>

      {/* Slide-Over Tutor Drawer */}
      {isOpen && (
        <aside className="tutor-drawer" aria-label="Kampus AI Tutor">
          <div className="tutor-header">
            <div className="tutor-header-left">
              <div className="tutor-avatar">🤖</div>
              <div>
                <div className="tutor-title">Kampus Context-Aware AI Tutor</div>
                <div className="tutor-subtitle">
                  Reads your live lesson, editor code, HTTP trace &amp; test assertions
                </div>
              </div>
            </div>
            <div className="tutor-header-actions">
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setShowApiKeyBar((v) => !v)}
                title={
                  usingEnvKey
                    ? 'Connected to GEMINI_API_KEY from .env'
                    : 'Configure Gemini, Groq, or OpenAI API Key for live LLM responses'
                }
                style={{
                  borderColor: apiKey.trim() ? 'rgba(16, 185, 129, 0.5)' : undefined,
                  color: apiKey.trim() ? '#34d399' : undefined,
                }}
              >
                🔑 {usingEnvKey ? 'Gemini Live (.env)' : apiKey.trim() ? 'Gemini Live' : 'API Key'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() =>
                  setMessages((prev) => (prev.length > 0 ? [prev[0]] : []))
                }
                title="Clear conversation history"
              >
                🗑️
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setIsOpen(false)}
                title="Close Tutor"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Live Context Status Bar */}
          <div className="tutor-context-bar">
            <span className="tutor-ctx-pill active">
              📍{' '}
              {mode === 'trainer' && activeSubconcept
                ? `${activeSubconcept.code} ${activeSubconcept.title}`
                : contextBadgeText}
            </span>
            {mode === 'trainer' && (
              <span className="tutor-ctx-pill">
                {trainerTab === 'exercise' ? '🏋️ Exercise Mode' : '📖 Concept Mode'}
              </span>
            )}
            {activeFile && (mode === 'trainer' || mode === 'sandbox') && (
              <span className="tutor-ctx-pill">📄 {activeFile.name}</span>
            )}
            {lastExecutionResult && (mode === 'trainer' || mode === 'sandbox') && (
              <span className="tutor-ctx-pill">
                ⚡ HTTP {lastExecutionResult.status}
              </span>
            )}
            {testResults && testResults.length > 0 && (
              <span className="tutor-ctx-pill">
                🧪 {passedTestsCount}/{testResults.length} Tests
              </span>
            )}
          </div>

          {/* Optional Gemini API Key Bar */}
          {showApiKeyBar && (
            <div className="tutor-apikey-bar">
              {usingEnvKey && (
                <span
                  style={{
                    fontSize: '11px',
                    color: '#34d399',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✅ Loaded GEMINI_API_KEY from .env
                </span>
              )}
              <input
                type="password"
                className="tutor-apikey-input"
                placeholder={
                  usingEnvKey
                    ? 'Using GEMINI_API_KEY from .env (paste a key here to override)'
                    : 'Optional: Paste Gemini (AIza...), Groq (gsk_...), or OpenAI (sk-...) key for live LLM'
                }
                value={usingEnvKey ? '' : apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
              />
              {!usingEnvKey && apiKey.trim() && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleSaveApiKey('')}
                >
                  {ENV_GEMINI_KEY ? 'Use .env Key' : 'Clear'}
                </button>
              )}
            </div>
          )}

          {/* Context-Aware Quick Prompt Chips */}
          <div className="tutor-chips">
            {suggestedChips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="tutor-chip"
                onClick={() => void handleAskQuestion(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Message Stream */}
          <div className="tutor-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`tutor-msg ${msg.role}`}>
                <div className="tutor-msg-meta">
                  <span>
                    {msg.role === 'assistant'
                      ? msg.source === 'gemini-api'
                        ? '✨ Kampus Tutor (Gemini 2.5 Flash)'
                        : '🤖 Kampus Tutor (Context Engine)'
                      : '👤 You'}
                  </span>
                  <span>
                    {msg.contextLabel ? `${msg.contextLabel} · ` : ''}
                    {msg.timestamp}
                  </span>
                </div>
                {msg.role === 'assistant' ? (
                  <div
                    className="tutor-msg-body"
                    dangerouslySetInnerHTML={{
                      __html: formatTutorMarkdown(msg.content),
                    }}
                  />
                ) : (
                  <div className="tutor-msg-body">
                    <p>{msg.content}</p>
                  </div>
                )}
              </div>
            ))}
            {isThinking && (
              <div className="tutor-msg assistant">
                <div className="tutor-msg-meta">
                  <span>🤖 Kampus Tutor</span>
                  <span>Analyzing context...</span>
                </div>
                <div className="tutor-msg-body">
                  <p>Inspecting your active lesson, editor code, and HTTP execution trace...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            className="tutor-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAskQuestion(inputText);
            }}
          >
            <textarea
              className="tutor-input"
              rows={2}
              placeholder="Ask anything about this lesson, why a decision was made, or how to fix your code... (Enter to send)"
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
              className="tutor-send-btn"
              disabled={!inputText.trim() || isThinking}
            >
              Ask →
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
