'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  CheckCircle2,
  Database,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  Layers,
  Map,
  Moon,
  RotateCcw,
  Search,
  Sun,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { KampusLogo } from './KampusLogo';
import type { AppMode } from '../types/studio';

interface TopbarProps {
  totalExercises: number;
  onResetSandboxState: () => void;
}

export function Topbar({ totalExercises, onResetSandboxState }: TopbarProps) {
  const mode = useStudioStore((s) => s.mode);
  const setMode = useStudioStore((s) => s.setMode);
  const completedIds = useStudioStore((s) => s.completedIds);
  const theme = useStudioStore((s) => s.theme);
  const toggleTheme = useStudioStore((s) => s.toggleTheme);
  const setCommandPaletteOpen = useStudioStore((s) => s.setCommandPaletteOpen);

  const modes: Array<{ id: AppMode; icon: React.ReactNode; label: string; tag?: string }> = [
    { id: 'trainer', icon: <GraduationCap size={14} strokeWidth={1.85} />, label: 'Trainer', tag: '32' },
    { id: 'syntax', icon: <ArrowLeftRight size={14} strokeWidth={1.85} />, label: 'JS ↔ Nest' },
    { id: 'prisma', icon: <Database size={14} strokeWidth={1.85} />, label: 'Prisma' },
    { id: 'mongoose', icon: <Layers size={14} strokeWidth={1.85} />, label: 'Mongoose' },
    { id: 'testing', icon: <CheckCircle2 size={14} strokeWidth={1.85} />, label: 'Testing' },
    { id: 'sandbox', icon: <FlaskConical size={14} strokeWidth={1.85} />, label: 'Sandbox' },
    { id: 'cheatsheet', icon: <Map size={14} strokeWidth={1.85} />, label: 'Architecture' },
  ];

  const pct =
    totalExercises > 0 ? Math.min(100, Math.round((completedIds.length / totalExercises) * 100)) : 0;

  return (
    <header className="topbar">
      <div className="brand">
        <div
          className="brand-lockup"
          title="Kampus Studio · Interactive NestJS, Prisma, Mongoose & Testing IDE"
          onClick={() => setMode('trainer')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setMode('trainer');
          }}
        >
          <KampusLogo size={30} />
          <div className="brand-text">
            <span className="brand-title">
              Kampus<span className="brand-title-muted">Studio</span>
            </span>
            <span className="brand-subtitle">BACKEND ARCHITECTURE LAB</span>
          </div>
        </div>
      </div>

      <nav className="mode-switcher" role="tablist" aria-label="Studio Workspace Modes">
        {modes.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`mode-btn ${isActive ? 'active' : ''}`}
              onClick={() => setMode(m.id)}
              title={m.label}
            >
              {isActive && (
                <motion.span
                  layoutId="topbar-mode-pill"
                  className="mode-btn-bg"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span className="mode-btn-icon" aria-hidden="true">
                {m.icon}
              </span>
              <span className="mode-btn-label">{m.label}</span>
              {m.tag && <span className="mode-btn-tag">{m.tag}</span>}
            </button>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <button
          type="button"
          className="cmdk-trigger"
          onClick={() => setCommandPaletteOpen(true)}
          title="Quick jump to any lesson or command (Ctrl+K)"
        >
          <Search size={13} strokeWidth={2} />
          <span className="hide-sm">Jump</span>
          <kbd>⌘K</kbd>
        </button>

        <div
          className="progress-pill"
          title={`${completedIds.length} of ${totalExercises} hands-on exercises passed (${pct}%)`}
        >
          <span className="progress-dot" />
          <span className="progress-text">
            {completedIds.length}/{totalExercises}
          </span>
          <div className="progress-bar-track">
            <motion.div
              className="progress-bar-fill"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="topbar-icon-btn"
          title={theme === 'dark' ? 'Switch to Architectural Vellum (Light)' : 'Switch to Obsidian Atelier (Dark)'}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun size={14} strokeWidth={1.85} /> : <Moon size={14} strokeWidth={1.85} />}
        </button>

        <button
          type="button"
          onClick={onResetSandboxState}
          className="topbar-icon-btn"
          title="Reset in-memory Kampus Database, Cache, and Rate Limit counters"
          aria-label="Reset sandbox database"
        >
          <RotateCcw size={14} strokeWidth={1.85} />
        </button>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="topbar-icon-btn"
          title="Open live Swagger API documentation"
          aria-label="Open Swagger docs"
        >
          <ExternalLink size={14} strokeWidth={1.85} />
        </a>
      </div>
    </header>
  );
}
