'use client';

import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import type { AppMode } from '../types/studio';

interface TopbarProps {
  totalExercises: number;
  onResetSandboxState: () => void;
}

export function Topbar({ totalExercises, onResetSandboxState }: TopbarProps) {
  const mode = useStudioStore((s) => s.mode);
  const setMode = useStudioStore((s) => s.setMode);
  const completedIds = useStudioStore((s) => s.completedIds);

  const modes: Array<{ id: AppMode; icon: string; label: string; tag?: string }> = [
    { id: 'trainer', icon: '🎓', label: 'Trainer', tag: '32' },
    { id: 'syntax', icon: '🧬', label: 'JS ↔ Nest' },
    { id: 'prisma', icon: '💎', label: 'Prisma' },
    { id: 'mongoose', icon: '🍃', label: 'Mongoose' },
    { id: 'testing', icon: '✅', label: 'Testing' },
    { id: 'sandbox', icon: '🧪', label: 'Sandbox' },
    { id: 'cheatsheet', icon: '🗺️', label: 'Architecture' },
  ];

  const pct =
    totalExercises > 0 ? Math.min(100, Math.round((completedIds.length / totalExercises) * 100)) : 0;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo" title="NestJS Studio · Kampus PropTech Platform">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="brand-text">
          <span className="brand-title">Kampus Studio</span>
          <span className="brand-subtitle">NestJS + ORM Lab</span>
        </div>
      </div>

      <nav className="mode-switcher" role="tablist" aria-label="Studio Workspace Modes">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
            title={m.label}
          >
            <span className="mode-btn-icon" aria-hidden="true">
              {m.icon}
            </span>
            <span className="mode-btn-label">{m.label}</span>
            {m.tag && <span className="mode-btn-tag">{m.tag}</span>}
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <div
          className="progress-pill"
          title={`${completedIds.length} of ${totalExercises} hands-on exercises passed (${pct}%)`}
        >
          <span className="progress-dot" />
          <span className="progress-text">
            {completedIds.length}/{totalExercises}
          </span>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={onResetSandboxState}
          className="btn btn-ghost btn-sm"
          title="Reset in-memory Kampus Database, Cache, and Rate Limit counters"
        >
          ↺ <span className="hide-sm">Reset DB</span>
        </button>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          title="Open live Swagger API documentation"
        >
          <span className="hide-sm">Swagger </span>↗
        </a>
      </div>
    </header>
  );
}
