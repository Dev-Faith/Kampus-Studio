'use client';

import React, { useState } from 'react';
import { useStudioStore } from '../store/useStudioStore';
import type { CurriculumModule, SandboxTemplate, Subconcept } from '../types/studio';

interface CurriculumSidebarProps {
  curriculum: CurriculumModule[];
  templates: SandboxTemplate[];
  activeDefaultFiles: { name: string; code: string }[];
  onSelectSubconcept: (sub: Subconcept) => void;
}

export function CurriculumSidebar({
  curriculum,
  templates,
  activeDefaultFiles,
  onSelectSubconcept,
}: CurriculumSidebarProps) {
  const mode = useStudioStore((s) => s.mode);
  const sidebarCollapsed = useStudioStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useStudioStore((s) => s.toggleSidebar);
  const sidebarWidth = useStudioStore((s) => s.sidebarWidth);
  const currentSubconceptId = useStudioStore((s) => s.currentSubconceptId);
  const currentTemplateId = useStudioStore((s) => s.currentTemplateId);
  const selectTemplate = useStudioStore((s) => s.selectTemplate);
  const completedIds = useStudioStore((s) => s.completedIds);
  const conceptSearch = useStudioStore((s) => s.conceptSearch);
  const setConceptSearch = useStudioStore((s) => s.setConceptSearch);
  const activeFileIndex = useStudioStore((s) => s.activeFileIndex);
  const setActiveFileIndex = useStudioStore((s) => s.setActiveFileIndex);
  const getCurrentFiles = useStudioStore((s) => s.getCurrentFiles);
  const addSandboxFile = useStudioStore((s) => s.addSandboxFile);

  const [collapsedMods, setCollapsedMods] = useState<Record<string, boolean>>({});
  const [newFileName, setNewFileName] = useState('');
  const [addingFile, setAddingFile] = useState(false);

  if (sidebarCollapsed) return null;

  const q = conceptSearch.trim().toLowerCase();
  const files = getCurrentFiles(activeDefaultFiles);

  return (
    <aside className="sidebar" style={{ width: sidebarWidth, minWidth: 190, maxWidth: 520 }}>
      {mode === 'trainer' ? (
        <div id="sidebar-trainer-view">
          <div className="sidebar-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span className="sidebar-label" style={{ marginBottom: 0 }}>
                KAMPUS CURRICULUM
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  className="icon-close-btn"
                  onClick={toggleSidebar}
                  title="Close Modules panel"
                  aria-label="Close Modules panel"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="search-input-wrap">
              <span className="search-icon">⌕</span>
              <input
                type="search"
                value={conceptSearch}
                onChange={(e) => setConceptSearch(e.target.value)}
                className="search-input with-icon"
                placeholder="Search lessons (DI, JWT, Prisma, Mongoose, Testing...)"
              />
            </div>
          </div>

          <div className="curriculum-tree">
            {curriculum.map((mod) => {
              const allModSubs = mod.subconcepts || [];
              const matchingSubs = allModSubs.filter(
                (s) =>
                  !q ||
                  s.title.toLowerCase().includes(q) ||
                  s.summary.toLowerCase().includes(q) ||
                  s.code.toLowerCase().includes(q) ||
                  mod.title.toLowerCase().includes(q),
              );
              if (matchingSubs.length === 0) return null;
              const isCollapsed = Boolean(collapsedMods[mod.id]);
              const doneInMod = allModSubs.filter((s) => completedIds.includes(s.id)).length;
              const hasActiveChild = allModSubs.some((s) => s.id === currentSubconceptId);

              return (
                <div
                  key={mod.id}
                  className={`mod-group ${hasActiveChild ? 'has-active' : ''}`}
                >
                  <button
                    type="button"
                    className="mod-header"
                    onClick={() =>
                      setCollapsedMods((prev) => ({ ...prev, [mod.id]: !prev[mod.id] }))
                    }
                  >
                    <span className="mod-num">{mod.number}</span>
                    <span className="mod-title-text">{mod.title}</span>
                    <span
                      className={`mod-count-pill ${
                        doneInMod === allModSubs.length && allModSubs.length > 0 ? 'complete' : ''
                      }`}
                    >
                      {doneInMod}/{allModSubs.length}
                    </span>
                    <span className="mod-chevron">{isCollapsed ? '▸' : '▾'}</span>
                  </button>

                  {!isCollapsed && (
                    <div className="mod-sublist">
                      {matchingSubs.map((sub) => {
                        const done = completedIds.includes(sub.id);
                        const isActive = sub.id === currentSubconceptId;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            className={`subconcept-item ${isActive ? 'active' : ''}`}
                            onClick={() => onSelectSubconcept(sub)}
                          >
                            <div className="subconcept-left">
                              <span className="sub-code">{sub.code}</span>
                              <span className="sub-title-text">{sub.title}</span>
                            </div>
                            {done ? (
                              <span className="sub-check" title="Exercise Completed">
                                ✓
                              </span>
                            ) : isActive ? (
                              <span className="sub-active-dot" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div id="sidebar-sandbox-view">
          <div className="sidebar-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="sidebar-label" style={{ marginBottom: 0 }}>
                KAMPUS SANDBOX BLUEPRINTS
              </span>
              <button
                type="button"
                className="icon-close-btn"
                onClick={toggleSidebar}
                title="Close Modules panel"
                aria-label="Close Modules panel"
              >
                ✕
              </button>
            </div>
            <p className="sidebar-hint">
              Load a multi-file Kampus PropTech architecture. All edits persist in localStorage.
            </p>
          </div>
          <div className="template-list">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`template-card ${tpl.id === currentTemplateId ? 'active' : ''}`}
                onClick={() => selectTemplate(tpl.id, tpl.files, tpl.presets)}
              >
                <h4>{tpl.name}</h4>
                <p>{tpl.description}</p>
              </div>
            ))}
          </div>

          <div className="sidebar-header" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="sidebar-label" style={{ marginBottom: 0 }}>
                WORKSPACE FILES
              </span>
              <button
                type="button"
                className="btn btn-xs btn-secondary"
                onClick={() => setAddingFile((v) => !v)}
              >
                + New File
              </button>
            </div>
            {addingFile && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="custom.guard.ts"
                  className="search-input"
                  style={{ marginTop: 0 }}
                />
                <button
                  type="button"
                  className="btn btn-xs btn-primary"
                  onClick={() => {
                    if (newFileName.trim()) {
                      addSandboxFile(newFileName.trim(), activeDefaultFiles);
                      setNewFileName('');
                      setAddingFile(false);
                    }
                  }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
          <div className="file-list">
            {files.map((f, idx) => (
              <div
                key={f.name + idx}
                className={`sidebar-file-item ${idx === activeFileIndex ? 'active' : ''}`}
                onClick={() => setActiveFileIndex(idx)}
              >
                <span>📄 {f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
