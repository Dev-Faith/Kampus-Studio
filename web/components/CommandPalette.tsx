'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Code2,
  Database,
  FileCode2,
  FlaskConical,
  Layers,
  Map,
  Maximize2,
  Moon,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  TestTube2,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { AppMode, Subconcept } from '../types/studio';

interface CommandPaletteProps {
  allSubconcepts: Subconcept[];
  onSelectSubconcept: (sub: Subconcept) => void;
  onResetDb: () => void;
}

interface CommandItem {
  id: string;
  group: 'Actions' | 'Workspaces' | 'Lessons';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette({
  allSubconcepts,
  onSelectSubconcept,
  onResetDb,
}: CommandPaletteProps) {
  const open = useStudioStore((s) => s.commandPaletteOpen);
  const setOpen = useStudioStore((s) => s.setCommandPaletteOpen);
  const setMode = useStudioStore((s) => s.setMode);
  const theme = useStudioStore((s) => s.theme);
  const toggleTheme = useStudioStore((s) => s.toggleTheme);
  const toggleFocusMode = useStudioStore((s) => s.toggleFocusMode);

  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const items: CommandItem[] = useMemo(() => {
    const goMode = (m: AppMode) => () => {
      setMode(m);
      setOpen(false);
    };

    const actions: CommandItem[] = [
      {
        id: 'act-theme',
        group: 'Actions',
        title: theme === 'dark' ? 'Switch to Architectural Vellum (Light Mode)' : 'Switch to Obsidian Atelier (Dark Mode)',
        subtitle: 'Theme',
        icon: theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />,
        run: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      {
        id: 'act-focus',
        group: 'Actions',
        title: 'Toggle Fullscreen Code Editor',
        subtitle: 'Layout',
        icon: <Maximize2 size={14} />,
        run: () => {
          toggleFocusMode();
          setOpen(false);
        },
      },
      {
        id: 'act-reset',
        group: 'Actions',
        title: 'Reset In-Memory Kampus Database & Cache',
        subtitle: 'Sandbox',
        icon: <RotateCcw size={14} />,
        run: () => {
          onResetDb();
          setOpen(false);
        },
      },
    ];

    const workspaces: CommandItem[] = [
      {
        id: 'ws-trainer',
        group: 'Workspaces',
        title: 'Concept Trainer (14 Modules · 32 Lessons)',
        subtitle: 'Mode',
        icon: <BookOpen size={14} />,
        run: goMode('trainer'),
      },
      {
        id: 'ws-syntax',
        group: 'Workspaces',
        title: 'JS ↔ NestJS Syntax Rosetta Stone',
        subtitle: 'Mode',
        icon: <Code2 size={14} />,
        run: goMode('syntax'),
      },
      {
        id: 'ws-prisma',
        group: 'Workspaces',
        title: 'Prisma ORM Mastery & Schema Explorer',
        subtitle: 'Mode',
        icon: <Database size={14} />,
        run: goMode('prisma'),
      },
      {
        id: 'ws-mongoose',
        group: 'Workspaces',
        title: 'Mongoose ODM Mastery & Aggregation',
        subtitle: 'Mode',
        icon: <Layers size={14} />,
        run: goMode('mongoose'),
      },
      {
        id: 'ws-testing',
        group: 'Workspaces',
        title: 'Unit & E2E Testing Mastery',
        subtitle: 'Mode',
        icon: <TestTube2 size={14} />,
        run: goMode('testing'),
      },
      {
        id: 'ws-sandbox',
        group: 'Workspaces',
        title: 'Free Multi-File Sandbox IDE',
        subtitle: 'Mode',
        icon: <FlaskConical size={14} />,
        run: goMode('sandbox'),
      },
      {
        id: 'ws-arch',
        group: 'Workspaces',
        title: 'Request Lifecycle Architecture Sheet',
        subtitle: 'Mode',
        icon: <Map size={14} />,
        run: goMode('cheatsheet'),
      },
    ];

    const lessons: CommandItem[] = allSubconcepts.map((sub) => ({
      id: `lesson-${sub.id}`,
      group: 'Lessons',
      title: `${sub.code}  ${sub.title}`,
      subtitle: sub.moduleTitle,
      icon: <FileCode2 size={14} />,
      run: () => {
        setMode('trainer');
        onSelectSubconcept(sub);
        setOpen(false);
      },
    }));

    return [...actions, ...workspaces, ...lessons];
  }, [allSubconcepts, onResetDb, onSelectSubconcept, setMode, setOpen, theme, toggleFocusMode, toggleTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 14);
    return items
      .filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          (it.subtitle || '').toLowerCase().includes(q) ||
          it.group.toLowerCase().includes(q),
      )
      .slice(0, 18);
  }, [items, query]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const groups = ['Actions', 'Workspaces', 'Lessons'] as const;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="cmdk-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ type: 'spring', stiffness: 480, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cmdk-header">
              <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                className="cmdk-input"
                placeholder="Jump to a lesson, switch mode, or run a studio command..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIdx((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter' && filtered[selectedIdx]) {
                    e.preventDefault();
                    filtered[selectedIdx].run();
                  }
                }}
              />
              <span className="badge badge-outline" style={{ fontSize: 10 }}>
                ESC
              </span>
            </div>

            <div className="cmdk-list">
              {filtered.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                  No lessons or commands match &ldquo;{query}&rdquo;
                </div>
              ) : (
                groups.map((grp) => {
                  const grpItems = filtered.filter((it) => it.group === grp);
                  if (grpItems.length === 0) return null;
                  return (
                    <div key={grp}>
                      <div className="cmdk-group-label">{grp}</div>
                      {grpItems.map((it) => {
                        const globalIdx = filtered.indexOf(it);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            className={`cmdk-item ${globalIdx === selectedIdx ? 'active' : ''}`}
                            onMouseEnter={() => setSelectedIdx(globalIdx)}
                            onClick={it.run}
                          >
                            <span className="cmdk-item-left">
                              <span style={{ color: globalIdx === selectedIdx ? 'var(--accent-fg)' : 'var(--text-muted)', display: 'inline-flex' }}>
                                {it.icon}
                              </span>
                              <span className="cmdk-item-title">{it.title}</span>
                            </span>
                            {it.subtitle && <span className="cmdk-item-sub">{it.subtitle}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="cmdk-footer">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={12} style={{ color: 'var(--accent-fg)' }} />
                Kampus Studio Quick Jump
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>
                  <kbd>↑</kbd> <kbd>↓</kbd> navigate
                </span>
                <span>
                  <kbd>↵</kbd> open
                </span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
