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

const ENV_GEMINI_KEY = (process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

export function KampusTutorBot({ activeSubconcept, currentFiles }: KampusTutorBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKeyBar, setShowApiKeyBar] = useState(false);
  const [apiKey, setApiKey] = useState(ENV_GEMINI_KEY);
  const [usingEnvKey, setUsingEnvKey] = useState(Boolean(ENV_GEMINI_KEY));
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mode = useStudioStore((s) => s.mode);
  const trainerTab = useStudioStore((s) => s.trainerTab);
  const activeFileIndex = useStudioStore((s) => s.activeFileIndex);
  const lastExecutionResult = useStudioStore((s) => s.lastExecutionResult);
  const testResults = useStudioStore((s) => s.testResults);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load saved Gemini API key from localStorage if present, otherwise use GEMINI_API_KEY from .env (or /api/tutor)
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

  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  const aiLive = Boolean(apiKey.trim()) || usingEnvKey;
  const hasConversation = messages.length > 0;

  // Auto-grow the composer textarea (1 → 5 rows)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [inputText, isOpen]);

  // Esc closes the drawer
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
      // Clipboard unavailable — ignore silently
    }
  };

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        className="tutor-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Ask Kampus Tutor"
        aria-label="Open Kampus AI Tutor"
        aria-expanded={isOpen}
      >
        <span className="tutor-fab-icon">
          <SparkIcon size={18} />
        </span>
        <span>Ask Kampus Tutor</span>
      </button>

      {isOpen && (
        <aside className={`tutor-drawer ${isWide ? 'wide' : ''}`} aria-label="Kampus AI Tutor">
          <header className="tutor-header">
            <div className="tutor-header-left">
              <div className="tutor-avatar">
                <SparkIcon size={16} />
              </div>
              <div className="tutor-heading">
                <div className="tutor-title">Kampus Tutor</div>
                <div className="tutor-status">
                  <i className={aiLive ? 'live' : ''} />
                  {aiLive ? 'Gemini · live AI' : 'Offline · built-in engine'}
                </div>
              </div>
            </div>
            <div className="tutor-header-actions">
              <button
                type="button"
                className="tutor-icon-btn"
                onClick={() => setShowApiKeyBar((v) => !v)}
                aria-pressed={showApiKeyBar}
                title={usingEnvKey ? 'Using GEMINI_API_KEY from .env' : 'Set API key'}
                aria-label="API key settings"
              >
                🔑
              </button>
              <button
                type="button"
                className="tutor-icon-btn"
                onClick={() => setIsWide((v) => !v)}
                aria-pressed={isWide}
                title={isWide ? 'Narrow view' : 'Wide view'}
                aria-label="Toggle wide view"
              >
                ⇔
              </button>
              <button
                type="button"
                className="tutor-icon-btn"
                onClick={() => setMessages([])}
                disabled={!hasConversation}
                title="New chat"
                aria-label="New chat"
              >
                ↺
              </button>
              <button
                type="button"
                className="tutor-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close (Esc)"
                aria-label="Close tutor"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Compact, single-row context the tutor can see */}
          <div className="tutor-context-bar" aria-label="Context the tutor can see">
            <span className="tutor-ctx-pill active" title={activeSubconcept?.title || contextBadgeText}>
              <span aria-hidden="true">📍</span>
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
                <span aria-hidden="true">📄</span>
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
              {usingEnvKey && <span className="tutor-apikey-note">✓ Using .env key</span>}
              <input
                type="password"
                className="tutor-apikey-input"
                placeholder={
                  usingEnvKey
                    ? 'Paste a key to override .env'
                    : 'Gemini (AIza…), Groq (gsk_…) or OpenAI (sk-…) key'
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
                  <SparkIcon size={22} />
                </div>
                <h2>How can I help with this lesson?</h2>
                <p>
                  I can see your lesson, open files, last HTTP response and test results — ask about
                  anything on screen.
                </p>
                <div className="tutor-suggest-grid">
                  {suggestedChips.slice(0, 6).map((chip) => {
                    const { icon, text } = splitChip(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        className="tutor-suggest"
                        onClick={() => void handleAskQuestion(chip)}
                      >
                        <span className="tutor-suggest-icon" aria-hidden="true">
                          {icon}
                        </span>
                        <span className="tutor-suggest-text">{text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="tutor-msg user" title={msg.timestamp}>
                  <div className="tutor-msg-bubble">{msg.content}</div>
                </div>
              ) : (
                <div key={msg.id} className="tutor-msg assistant">
                  <div className="tutor-msg-avatar" aria-hidden="true">
                    <SparkIcon size={13} />
                  </div>
                  <div className="tutor-msg-main">
                    <div className="tutor-msg-meta">
                      <span className="tutor-msg-author">Kampus Tutor</span>
                      <span
                        className={`tutor-source ${msg.source === 'gemini-api' ? 'ai' : 'local'}`}
                        title={
                          msg.source === 'gemini-api'
                            ? 'Answered by Gemini with your lesson context'
                            : 'Answered offline by the built-in context engine'
                        }
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
                        {copiedId === msg.id ? '✓ Copied' : '⧉ Copy'}
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}

            {isThinking && (
              <div className="tutor-msg assistant">
                <div className="tutor-msg-avatar" aria-hidden="true">
                  <SparkIcon size={13} />
                </div>
                <div className="tutor-typing" role="status" aria-live="polite">
                  <span className="tutor-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  Reading your files…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {hasConversation && (
            <div className="tutor-quick-row" aria-label="Suggested questions">
              {suggestedChips.slice(0, 6).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="tutor-chip"
                  title={chip}
                  onClick={() => void handleAskQuestion(chip)}
                >
                  {chip}
                </button>
              ))}
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
                placeholder="Ask about this lesson or your code…"
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
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="tutor-hint">
              <kbd>Enter</kbd> to send · <kbd>Shift</kbd> + <kbd>Enter</kbd> for a new line
            </div>
          </form>
        </aside>
      )}
    </>
  );
}

function SparkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
      <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" opacity="0.85" />
    </svg>
  );
}

/** Splits a suggestion like "🗂️ How do…" into an emoji icon and plain text. */
function splitChip(chip: string): { icon: string; text: string } {
  const chars = Array.from(chip);
  const first = chars[0] || '';
  if (first && !/[A-Za-z0-9"'(@$`]/.test(first)) {
    let icon = first;
    let idx = 1;
    if (chars[1] === '\uFE0F') {
      icon += '\uFE0F';
      idx = 2;
    }
    return { icon, text: chars.slice(idx).join('').trim() };
  }
  return { icon: '💬', text: chip };
}
