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
  const sidebarCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStudioStore((s) => s.toggleSidebar);
  const trainerCollapsed = useStudioStore((s) => s.trainerCollapsed);
  const toggleTrainer = useStudioStore((s) => s.toggleTrainer);

  const modes: Array<{ id: AppMode; icon: string; label: string; tag?: string }> = [
    { id: 'trainer', icon: '🎓', label: 'Concept Trainer', tag: '32' },
    { id: 'syntax', icon: '🧬', label: 'JS ↔ NestJS' },
    { id: 'prisma', icon: '💎', label: 'Prisma ORM' },
    { id: 'mongoose', icon: '🍃', label: 'Mongoose ODM' },
    { id: 'testing', icon: '✅', label: 'Unit & E2E Testing' },
    { id: 'sandbox', icon: '🧪', label: 'Sandbox IDE' },
    { id: 'cheatsheet', icon: '🗺️', label: 'Architecture' },
  ];

  const pct =
    totalExercises > 0 ? Math.min(100, Math.round((completedIds.length / totalExercises) * 100)) : 0;

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-logo" title="NestJS Studio · Kampus PropTech Platform">
          <svg
            width="19"
            height="19"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span className="brand-title">Kampus Studio</span>
            <span className="brand-pro-badge">NESTJS + ORM LAB</span>
          </div>
          <span className="brand-subtitle">
            Interactive PropTech Backend Architecture &amp; Live TypeScript IDE
          </span>
        </div>

        {(mode === 'trainer' || mode === 'sandbox') && (
          <div className="pane-toggles-group" title="Toggle workspace panels">
            <button
              type="button"
              onClick={toggleSidebar}
              className={`pane-toggle-btn ${!sidebarCollapsed ? 'active' : ''}`}
              title={sidebarCollapsed ? 'Show Curriculum Sidebar' : 'Hide Curriculum Sidebar'}
            >
              <span className="pane-icon">◧</span>
              <span>Modules</span>
            </button>
            {mode === 'trainer' && (
              <button
                type="button"
                onClick={toggleTrainer}
                className={`pane-toggle-btn ${!trainerCollapsed ? 'active' : ''}`}
                title={trainerCollapsed ? 'Show Lesson & Exercise Guide' : 'Hide Lesson & Exercise Guide'}
              >
                <span className="pane-icon">◨</span>
                <span>Lesson</span>
              </button>
            )}
          </div>
        )}
      </div>

      <nav className="mode-switcher" role="tablist" aria-label="Studio Workspace Modes">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-btn ${mode === m.id ? 'active' : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className="mode-btn-icon">{m.icon}</span>
            <span>{m.label}</span>
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
          <div className="progress-info">
            <span className="progress-text">
              {completedIds.length}/{totalExercises} Mastered
            </span>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetSandboxState}
          className="btn btn-ghost btn-sm"
          title="Reset in-memory Kampus Database, Cache, and Rate Limit counters"
        >
          ↺ Reset DB
        </button>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost btn-sm"
          title="Open live Swagger API documentation"
        >
          Swagger ↗
        </a>
      </div>
    </header>
  );
}
