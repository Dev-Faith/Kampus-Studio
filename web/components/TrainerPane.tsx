'use client';

import React, { useEffect, useState } from 'react';
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

  const idx = allSubconcepts.findIndex((s) => s.id === sub.id);
  const isCompleted = completedIds.includes(sub.id);
  const activeLcSet = new Set(LIFECYCLE_MAP[sub.moduleId || ''] || ['handler']);

  const [showRationale, setShowRationale] = useState(false);

  // Reset rationale toggle when changing lesson
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
          <span className="badge badge-accent">
            {sub.code} • {sub.moduleTitle}
          </span>
          <span className="badge badge-outline">{sub.difficulty || 'Intermediate'}</span>
          {isCompleted && <span className="badge badge-success">✓ Completed</span>}
        </div>
        <h1 className="concept-title">{sub.title}</h1>
        <p className="concept-summary">{sub.summary}</p>

        <div className="trainer-tabs">
          <button
            type="button"
            className={`trainer-tab ${trainerTab === 'learn' ? 'active' : ''}`}
            onClick={() => setTrainerTab('learn', sub)}
          >
            📖 Concept &amp; Example
          </button>
          <button
            type="button"
            className={`trainer-tab ${trainerTab === 'exercise' ? 'active' : ''}`}
            onClick={() => setTrainerTab('exercise', sub)}
          >
            🏋️ Hands-on Exercise
          </button>
        </div>
      </div>

      {trainerTab === 'learn' ? (
        <div className="trainer-body">
          <div
            className="lifecycle-mini-bar"
            title="Where this concept runs in the NestJS request lifecycle"
          >
            <span className={`lc-node ${activeLcSet.has('middleware') ? 'active' : ''}`}>
              Middleware
            </span>
            <span className="lc-arrow">→</span>
            <span className={`lc-node ${activeLcSet.has('guard') ? 'active' : ''}`}>Guards</span>
            <span className="lc-arrow">→</span>
            <span className={`lc-node ${activeLcSet.has('interceptor') ? 'active' : ''}`}>
              Interceptors
            </span>
            <span className="lc-arrow">→</span>
            <span className={`lc-node ${activeLcSet.has('pipe') ? 'active' : ''}`}>Pipes</span>
            <span className="lc-arrow">→</span>
            <span className={`lc-node ${activeLcSet.has('handler') ? 'active' : ''}`}>
              Controller/Service
            </span>
            <span className="lc-arrow">→</span>
            <span className={`lc-node ${activeLcSet.has('filter') ? 'active' : ''}`}>Filters</span>
          </div>

          <div className="prose" dangerouslySetInnerHTML={{ __html: sub.theory }} />

          {decisions.length > 0 && (
            <div className="rationale-toggle-wrap">
              <button
                type="button"
                className="rationale-toggle-btn"
                onClick={() => setShowRationale((prev) => !prev)}
              >
                <span>
                  🔬 {showRationale ? 'Hide' : 'Show'} Detailed Explanation ({decisions.length}{' '}
                  Architectural Decisions)
                </span>
                <span>{showRationale ? '▴' : '▾'}</span>
              </button>

              {showRationale && (
                <div className="rationale-drawer">
                  {decisions.map((d, dIdx) => (
                    <div key={dIdx} className="rationale-decision-card">
                      <div className="rationale-q">
                        <span className="rationale-num">Decision #{dIdx + 1}</span>
                        <h5>🤔 {d.question}</h5>
                      </div>
                      <div className="rationale-grid">
                        <div className="rationale-box anti-pattern">
                          <strong>❌ Why Not Do It Directly? (The Anti-Pattern)</strong>
                          <p style={{ whiteSpace: 'pre-line' }}>{d.antiPattern}</p>
                        </div>
                        <div className="rationale-box technical-why">
                          <strong>⚙️ Technical &amp; Architectural Reason</strong>
                          <p style={{ whiteSpace: 'pre-line' }}>{d.technicalReason}</p>
                        </div>
                      </div>
                      <div className="rationale-rule">
                        <strong>🏆 Best-Practice Rule:</strong> {d.bestPracticeRule}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="lesson-actions-card">
            <div>
              <strong>Interactive Code Loaded in IDE &rarr;</strong>
              <p>
                Edit the code on the right (all edits auto-save to <code>localStorage</code>) or
                click a preset request to see how NestJS executes it.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFilesForCurrentBuffer(sub.exampleFiles || [])}
              >
                ↺ Reset Example Code
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setTrainerTab('exercise', sub)}
              >
                Start Exercise &rarr;
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="trainer-body">
          {sub.exercise && (
            <div className="exercise-card">
              <div className="exercise-card-header">
                <span className="badge badge-warning">CODING CHALLENGE</span>
                <h3>{sub.exercise.title}</h3>
              </div>
              <div
                className="prose"
                dangerouslySetInnerHTML={{ __html: sub.exercise.prompt }}
              />

              <div className="exercise-toolbar">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={onRunExerciseVerification}
                >
                  ✓ Run &amp; Verify Exercise
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setFilesForCurrentBuffer(sub.exercise?.starterFiles || [])}
                >
                  ↺ Reset Starter Code
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setHintVisible(!hintVisible)}
                >
                  💡 {hintVisible ? 'Hide Hint' : 'Show Hint'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setFilesForCurrentBuffer(sub.exercise?.solutionFiles || [])}
                >
                  👁️ Load Solution
                </button>
              </div>

              {hintVisible && sub.exercise.hints && (
                <div className="hints-box">
                  <strong>Hints:</strong>
                  <ul>
                    {sub.exercise.hints.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {testResults.length > 0 && (
                <div className="exercise-inline-results">
                  {testResults.map((r, i) => (
                    <div key={i} className={`test-row ${r.pass ? 'pass' : 'fail'}`}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 600,
                        }}
                      >
                        <span>
                          {r.pass ? '✓ PASS' : '✗ FAIL'} — {r.name}
                        </span>
                        <span className="badge badge-outline">
                          HTTP {r.lastRes?.status ?? '-'}
                        </span>
                      </div>
                      {!r.pass && r.reason && (
                        <div className="muted-text" style={{ color: '#fca5a5' }}>
                          {r.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="trainer-footer">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={idx <= 0}
          onClick={() => idx > 0 && onSelectSubconcept(allSubconcepts[idx - 1], 'learn')}
        >
          &larr; Previous
        </button>
        <span className="muted-text">
          {idx + 1} of {allSubconcepts.length}
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
          Next Concept &rarr;
        </button>
      </footer>
    </section>
  );
}
