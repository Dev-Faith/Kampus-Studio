'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Dumbbell,
  Eye,
  Lightbulb,
  Microscope,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import type { ArchitecturalDecision, Subconcept } from '../types/studio';

interface TrainerPaneProps {
  sub: Subconcept;
  allSubconcepts: Subconcept[];
  onRunExerciseVerification: () => void;
  onSelectSubconcept: (sub: Subconcept, tab?: 'learn' | 'exercise') => void;
}

const LIFECYCLE_MAP: Record<string, string[]> = {
  'mod-architecture': ['middleware', 'handler'],
  'mod-pipes': ['pipe'],
  'mod-guards': ['guard'],
  'mod-auth': ['guard', 'handler'],
  'mod-interceptors': ['interceptor'],
  'mod-throttling': ['guard'],
  'mod-caching': ['interceptor', 'handler'],
  'mod-exceptions': ['filter'],
  'mod-database': ['handler'],
  'mod-events-idempotency': ['handler'],
  'mod-versioning-observability': ['middleware', 'handler'],
  'mod-testing': ['pipe', 'guard', 'handler'],
};

export function TrainerPane({
  sub,
  allSubconcepts,
  onRunExerciseVerification,
  onSelectSubconcept,
}: TrainerPaneProps) {
  const trainerTab = useStudioStore((s) => s.trainerTab);
  const setTrainerTab = useStudioStore((s) => s.setTrainerTab);
  const completedIds = useStudioStore((s) => s.completedIds);
  const setFilesForCurrentBuffer = useStudioStore((s) => s.setFilesForCurrentBuffer);
  const hintVisible = useStudioStore((s) => s.hintVisible);
  const setHintVisible = useStudioStore((s) => s.setHintVisible);
  const testResults = useStudioStore((s) => s.testResults);
  const trainerPaneWidth = useStudioStore((s) => s.trainerPaneWidth);
  const toggleTrainer = useStudioStore((s) => s.toggleTrainer);

  const idx = allSubconcepts.findIndex((s) => s.id === sub.id);
  const isCompleted = completedIds.includes(sub.id);
  const activeLcSet = new Set(LIFECYCLE_MAP[sub.moduleId || ''] || ['handler']);

  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    setShowRationale(false);
  }, [sub.id]);

  const decisions: ArchitecturalDecision[] =
    sub.architecturalDecisions ||
    (typeof window !== 'undefined' && window.NEST_ARCHITECTURAL_RATIONALE?.[sub.id]) ||
    [];

  return (
    <section
      className="trainer-pane"
      style={{ width: trainerPaneWidth, minWidth: 300, maxWidth: 680 }}
    >
      <div className="trainer-header">
        <div className="concept-meta">
          <div className="concept-meta-badges">
            <span className="badge badge-accent">{sub.code}</span>
            <span className="concept-module" title={sub.moduleTitle}>
              {sub.moduleTitle}
            </span>
            <span className="badge badge-outline">{sub.difficulty || 'Intermediate'}</span>
            {isCompleted && (
              <span className="badge badge-success">
                <Check size={11} strokeWidth={2.6} /> Done
              </span>
            )}
          </div>
          <button
            type="button"
            className="icon-close-btn"
            onClick={toggleTrainer}
            title="Close Lesson panel"
            aria-label="Close Lesson panel"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <h1 className="concept-title">{sub.title}</h1>
        <p className="concept-summary">{sub.summary}</p>

        <div className="trainer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={trainerTab === 'learn'}
            className={`trainer-tab ${trainerTab === 'learn' ? 'active' : ''}`}
            onClick={() => setTrainerTab('learn', sub)}
          >
            {trainerTab === 'learn' && (
              <motion.span
                layoutId="trainer-tab-pill"
                className="trainer-tab-bg"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <BookOpen size={13} strokeWidth={2} />
            Concept
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={trainerTab === 'exercise'}
            className={`trainer-tab ${trainerTab === 'exercise' ? 'active' : ''}`}
            onClick={() => setTrainerTab('exercise', sub)}
          >
            {trainerTab === 'exercise' && (
              <motion.span
                layoutId="trainer-tab-pill"
                className="trainer-tab-bg"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <Dumbbell size={13} strokeWidth={2} />
            Exercise
          </button>
        </div>

        <div className="lesson-progress-hairline" aria-hidden="true">
          <motion.div
            className="lesson-progress-hairline-fill"
            initial={false}
            animate={{
              width: `${allSubconcepts.length > 0 ? ((idx + 1) / allSubconcepts.length) * 100 : 0}%`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          />
        </div>
      </div>

      {trainerTab === 'learn' ? (
        <motion.div
          key={`learn-${sub.id}`}
          className="trainer-body"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div
            className="lifecycle-track"
            title="Where this lesson executes inside the 6-stage NestJS Request Lifecycle"
          >
            {[
              { id: 'middleware', num: '01', label: 'Middleware' },
              { id: 'guard', num: '02', label: 'Guards' },
              { id: 'interceptor', num: '03', label: 'Interceptors' },
              { id: 'pipe', num: '04', label: 'Pipes' },
              { id: 'handler', num: '05', label: 'Handler' },
              { id: 'filter', num: '06', label: 'Filters' },
            ].map((stage) => {
              const active = activeLcSet.has(stage.id);
              return (
                <div
                  key={stage.id}
                  className={`lc-stage-pill ${active ? 'active' : ''}`}
                >
                  <span className="lc-stage-num">{stage.num}</span>
                  <span>{stage.label}</span>
                  {active && <span className="lc-stage-dot" />}
                </div>
              );
            })}
          </div>

          <div className="prose" dangerouslySetInnerHTML={{ __html: sub.theory }} />

          {decisions.length > 0 && (
            <div className="rationale-toggle-wrap">
              <button
                type="button"
                className="rationale-toggle-btn"
                onClick={() => setShowRationale((prev) => !prev)}
                aria-expanded={showRationale}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Microscope size={15} style={{ color: 'var(--accent-fg)' }} />
                  <span>
                    {showRationale ? 'Hide' : 'Show'} Architectural Rationale ({decisions.length}{' '}
                    {decisions.length === 1 ? 'Decision' : 'Decisions'})
                  </span>
                </span>
                <motion.span
                  animate={{ rotate: showRationale ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'inline-flex', color: 'var(--text-muted)' }}
                >
                  <ChevronDown size={15} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {showRationale && (
                  <motion.div
                    className="rationale-drawer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    {decisions.map((d, dIdx) => (
                      <div key={dIdx} className="rationale-decision-card">
                        <div className="rationale-q">
                          <span className="rationale-num">Decision #{dIdx + 1}</span>
                          <h5>{d.question}</h5>
                        </div>
                        <div className="rationale-grid">
                          <div className="rationale-box anti-pattern">
                            <strong>
                              <AlertTriangle size={12} /> Anti-Pattern
                            </strong>
                            <p style={{ whiteSpace: 'pre-line' }}>{d.antiPattern}</p>
                          </div>
                          <div className="rationale-box technical-why">
                            <strong>
                              <Cpu size={12} /> Engineering Reason
                            </strong>
                            <p style={{ whiteSpace: 'pre-line' }}>{d.technicalReason}</p>
                          </div>
                        </div>
                        <div className="rationale-rule">
                          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 6 }}>
                            <Award size={13} /> Rule:
                          </strong>
                          {d.bestPracticeRule}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="lesson-actions-card">
            <div>
              <strong>Interactive Workspace Loaded</strong>
              <p>
                Edit any open tab on the right (changes auto-save locally) or fire a preset request
                below to inspect the live NestJS pipeline.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFilesForCurrentBuffer(sub.exampleFiles || [])}
              >
                <RotateCcw size={12} /> Reset Example
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setTrainerTab('exercise', sub)}
              >
                Start Exercise <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key={`ex-${sub.id}`}
          className="trainer-body"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {sub.exercise && (
            <div className="exercise-card">
              <div className="exercise-card-header">
                <span className="badge badge-warning">Coding Challenge</span>
                <h3>{sub.exercise.title}</h3>
              </div>
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: sub.exercise.prompt }}
              />

              <div className="exercise-toolbar">
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={onRunExerciseVerification}
                >
                  <CheckCircle2 size={13} strokeWidth={2.2} /> Verify Exercise
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFilesForCurrentBuffer(sub.exercise?.starterFiles || [])}
                >
                  <RotateCcw size={12} /> Reset Starter
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setHintVisible(!hintVisible)}
                >
                  <Lightbulb size={13} /> {hintVisible ? 'Hide Hint' : 'Hint'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilesForCurrentBuffer(sub.exercise?.solutionFiles || [])}
                >
                  <Eye size={13} /> Solution
                </button>
              </div>

              <AnimatePresence initial={false}>
                {hintVisible && sub.exercise.hints && (
                  <motion.div
                    className="hints-box"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <strong>Hints</strong>
                    <ul>
                      {sub.exercise.hints.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>

              {testResults.length > 0 && (
                <div className="exercise-inline-results">
                  {testResults.map((r, i) => (
                    <motion.div
                      key={`${r.name}-${i}`}
                      className={`test-row ${r.pass ? 'pass' : 'fail'}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.16 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {r.pass ? (
                            <CheckCircle2 size={14} style={{ color: 'var(--green-fg)' }} />
                          ) : (
                            <XCircle size={14} style={{ color: 'var(--red-fg)' }} />
                          )}
                          {r.name}
                        </span>
                        <span className="badge badge-outline tabular">
                          HTTP {r.lastRes?.status ?? '-'}
                        </span>
                      </div>
                      {!r.pass && r.reason && (
                        <div className="muted-text" style={{ color: 'var(--red-fg)' }}>
                          {r.reason}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      <footer className="trainer-footer">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={idx <= 0}
          onClick={() => idx > 0 && onSelectSubconcept(allSubconcepts[idx - 1], 'learn')}
        >
          <ArrowLeft size={13} /> Previous
        </button>
        <span className="muted-text tabular">
          {idx + 1} / {allSubconcepts.length}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={idx >= allSubconcepts.length - 1}
          onClick={() =>
            idx < allSubconcepts.length - 1 &&
            onSelectSubconcept(allSubconcepts[idx + 1], 'learn')
          }
        >
          Next <ArrowRight size={13} />
        </button>
      </footer>
    </section>
  );
}
