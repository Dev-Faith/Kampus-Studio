'use client';

import React, { useState } from 'react';
import { highlightCodeHtml } from '../utils/highlightCode';

export interface TestingHarnessItem {
  id: string;
  token: string;
  category: string;
  meaning: string;
  underTheHood: string;
  whyBestPractice: string;
}

export interface TestingChapter {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  relatedSubconceptId: string;
  kampusScenario: string;
  syntaxComparison: {
    leftTitle: string;
    leftCode: string;
    rightTitle: string;
    rightCode: string;
  };
  syntaxMap: Array<{
    syntax: string;
    purpose: string;
    pipelineCoverage: string;
  }>;
  architecturalDecisions: Array<{
    question: string;
    antiPattern: string;
    technicalReason: string;
    bestPracticeRule: string;
  }>;
}

interface TestingMasteryViewProps {
  fullSpec: string;
  harnessExplorer: TestingHarnessItem[];
  chapters: TestingChapter[];
  onOpenInLiveIde: (conceptId: string) => void;
}

export function TestingMasteryView({
  fullSpec,
  harnessExplorer,
  chapters,
  onOpenInLiveIde,
}: TestingMasteryViewProps) {
  const [search, setSearch] = useState('');
  const [activeHarnessId, setActiveHarnessId] = useState<string>(
    harnessExplorer[0]?.id || 'create-testing-module',
  );
  const [showFullSpec, setShowFullSpec] = useState(false);
  const [openDecisionChapters, setOpenDecisionChapters] = useState<Record<string, boolean>>({
    'testing-ch1-pyramid': true,
    'testing-ch2-testing-module': true,
    'testing-ch3-jest-mocks': true,
    'testing-ch4-async-exceptions': true,
    'testing-ch5-supertest-e2e': true,
    'testing-ch6-override-guards': true,
    'testing-ch7-stateful-integration': true,
  });

  const q = search.trim().toLowerCase();
  const activeHarnessItem =
    harnessExplorer.find((h) => h.id === activeHarnessId) || harnessExplorer[0];

  const filteredChapters = chapters.filter((ch) => {
    if (!q) return true;
    const haystack = [
      ch.title,
      ch.subtitle,
      ch.kampusScenario,
      ch.syntaxComparison.leftTitle,
      ch.syntaxComparison.leftCode,
      ch.syntaxComparison.rightTitle,
      ch.syntaxComparison.rightCode,
      ...(ch.syntaxMap || []).map((t) => `${t.syntax} ${t.purpose} ${t.pipelineCoverage}`),
      ...(ch.architecturalDecisions || []).map(
        (d) => `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`,
      ),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const allExpanded = chapters.every((c) => openDecisionChapters[c.id]);

  const toggleAllDecisions = () => {
    const next: Record<string, boolean> = {};
    for (const c of chapters) {
      next[c.id] = !allExpanded;
    }
    setOpenDecisionChapters(next);
  };

  const toggleChapterDecision = (id: string) => {
    setOpenDecisionChapters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="syntax-view">
      <aside className="syntax-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-label">✅ UNIT &amp; E2E TESTING MASTERY</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            placeholder="Search (@nestjs/testing, jest.fn, supertest, overrideGuard...)"
          />
        </div>

        <div className="curriculum-tree">
          <div className="mod-group">
            <button
              type="button"
              className="mod-header"
              onClick={() => {
                const el = document.getElementById('testing-harness-decompiler');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="mod-num">00</span>
              <span style={{ flex: 1 }}>@nestjs/testing &amp; Supertest Decompiler</span>
            </button>
            <div className="mod-sublist">
              {harnessExplorer.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`subconcept-item ${activeHarnessId === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveHarnessId(item.id);
                    const el = document.getElementById('testing-harness-decompiler');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <span>{item.category}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredChapters.map((ch) => (
            <div key={ch.id} className="mod-group">
              <button
                type="button"
                className="mod-header"
                onClick={() => {
                  const el = document.getElementById(`testing-chapter-${ch.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="mod-num">{ch.number}</span>
                <span style={{ flex: 1 }}>{ch.title}</span>
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="syntax-main">
        <div className="syntax-hero">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <span className="badge badge-accent">
                @NESTJS/TESTING + JEST SPIES + SUPERTEST PIPELINE
              </span>
              <h2>✅ Mastering Unit &amp; Integration Testing on Kampus PropTech</h2>
              <p className="muted-text">
                Learn how to test every layer of the <strong>Kampus Student Housing &amp; Escrow</strong>{' '}
                backend—from millisecond isolated service unit tests with{' '}
                <code>Test.createTestingModule()</code> &amp; <code>jest.fn()</code> to full HTTP
                pipeline integration tests with <code>createNestApplication()</code>,{' '}
                <code>ValidationPipe</code>, <code>.overrideGuard()</code>, and <code>supertest</code>.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={toggleAllDecisions}
              >
                {allExpanded
                  ? '▾ Collapse All Decision Explanations'
                  : '🔬 Expand All Decision Explanations'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenInLiveIde('testing-unit-testingmodule-mocks')}
              >
                ▶ Run Live Unit Test Suite in IDE (14.1)
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => onOpenInLiveIde('testing-integration-supertest-overrides')}
              >
                ▶ Run Live Supertest E2E Suite in IDE (14.2)
              </button>
            </div>
          </div>
        </div>

        {/* INTERACTIVE TEST HARNESS DECOMPILER */}
        <div id="testing-harness-decompiler" className="decompiler-card">
          <div className="decompiler-header">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div>
                <h3>
                  🧪 Interactive <code>@nestjs/testing</code>, <code>jest.fn()</code> &amp;{' '}
                  <code>supertest</code> Harness Decompiler
                </h3>
                <p className="muted-text">
                  Click any testing construct below to inspect what happens inside the NestJS IoC
                  container and Jest runtime, and why it is a production best practice.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowFullSpec((v) => !v)}
              >
                {showFullSpec
                  ? '▾ Hide Full Kampus .spec.ts Blueprint'
                  : '📄 View Full Kampus Unit + E2E .spec.ts Blueprint'}
              </button>
            </div>

            {showFullSpec && (
              <div className="syntax-code-pane" style={{ width: '100%', marginTop: 8 }}>
                <div className="syntax-code-header nest-hdr">
                  <span>kampus-booking.spec.ts (Complete Unit + Integration Test Blueprint)</span>
                  <span>TypeScript / Jest</span>
                </div>
                <pre
                  className="syntax-code-pre"
                  dangerouslySetInnerHTML={{
                    __html: highlightCodeHtml(fullSpec, 'ts'),
                  }}
                />
              </div>
            )}

            <div className="decompiler-pills" style={{ marginTop: 6 }}>
              {harnessExplorer.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`decompiler-pill ${
                    item.id === activeHarnessItem?.id ? 'active' : ''
                  }`}
                  onClick={() => setActiveHarnessId(item.id)}
                >
                  {item.category}
                </button>
              ))}
            </div>
          </div>

          {activeHarnessItem && (
            <div className="decompiler-body">
              <div style={{ marginBottom: 10 }}>
                <span className="badge badge-outline" style={{ marginBottom: 6 }}>
                  {activeHarnessItem.category}
                </span>
                <h4 style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  <code>{activeHarnessItem.token}</code>
                </h4>
              </div>

              <div className="rationale-grid">
                <div className="rationale-box technical-why">
                  <strong>🎯 What This Construct Does</strong>
                  <p>{activeHarnessItem.meaning}</p>
                </div>
                <div className="rationale-box anti-pattern">
                  <strong>⚙️ Under the Hood in NestJS &amp; Jest</strong>
                  <p>{activeHarnessItem.underTheHood}</p>
                </div>
              </div>

              <div className="rationale-rule" style={{ marginTop: 10 }}>
                <strong>🏆 Why It’s Best Practice:</strong> {activeHarnessItem.whyBestPractice}
              </div>
            </div>
          )}
        </div>

        {/* TESTING MASTERY CHAPTERS */}
        <div className="syntax-cards-container">
          {filteredChapters.map((ch) => {
            const isDecisionOpen = Boolean(openDecisionChapters[ch.id]);
            return (
              <div key={ch.id} id={`testing-chapter-${ch.id}`} className="syntax-card">
                <div className="syntax-card-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-accent">Chapter {ch.number}</span>
                      <span className="badge badge-outline">
                        {ch.relatedSubconceptId === 'testing-unit-testingmodule-mocks'
                          ? 'Unit Testing (14.1)'
                          : 'HTTP Integration & E2E (14.2)'}
                      </span>
                    </div>
                    <h4>{ch.title}</h4>
                    <p className="muted-text" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {ch.subtitle}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`rationale-toggle-btn ${isDecisionOpen ? 'open' : ''}`}
                      style={{ width: 'auto', margin: 0, padding: '6px 12px' }}
                      onClick={() => toggleChapterDecision(ch.id)}
                    >
                      <span>
                        🔬 {isDecisionOpen ? 'Hide' : 'Show'} Detailed Explanation (
                        {ch.architecturalDecisions.length} Decision
                        {ch.architecturalDecisions.length === 1 ? '' : 's'})
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => onOpenInLiveIde(ch.relatedSubconceptId)}
                    >
                      ▶ Practice in Live IDE (
                      {ch.relatedSubconceptId === 'testing-unit-testingmodule-mocks'
                        ? '14.1'
                        : '14.2'}
                      )
                    </button>
                  </div>
                </div>

                <div className="decompiler-takeaway" style={{ marginBottom: 12 }}>
                  <strong>🏠 Kampus Engineering Scenario:</strong> {ch.kampusScenario}
                </div>

                <div className="syntax-split-grid">
                  <div className="syntax-code-pane">
                    <div className="syntax-code-header nest-hdr">
                      <span>{ch.syntaxComparison.leftTitle}</span>
                      <span>TypeScript / Jest</span>
                    </div>
                    <pre
                      className="syntax-code-pre"
                      dangerouslySetInnerHTML={{
                        __html: highlightCodeHtml(ch.syntaxComparison.leftCode, 'ts'),
                      }}
                    />
                  </div>
                  <div className="syntax-code-pane">
                    <div className="syntax-code-header vanilla-hdr">
                      <span>{ch.syntaxComparison.rightTitle}</span>
                      <span>TypeScript / Supertest</span>
                    </div>
                    <pre
                      className="syntax-code-pre"
                      dangerouslySetInnerHTML={{
                        __html: highlightCodeHtml(ch.syntaxComparison.rightCode, 'ts'),
                      }}
                    />
                  </div>
                </div>

                {/* SYNTAX BREAKDOWN TABLE */}
                <table className="token-map-table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '32%' }}>@nestjs/testing / Jest / Supertest Syntax</th>
                      <th style={{ width: '36%' }}>Exact Purpose in Test Suite</th>
                      <th>Pipeline Coverage &amp; Guarantee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ch.syntaxMap || []).map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <code className="nest-tok">{row.syntax}</code>
                        </td>
                        <td>{row.purpose}</td>
                        <td>{row.pipelineCoverage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ARCHITECTURAL DECISIONS ("WHY?") DRAWER */}
                {isDecisionOpen &&
                  ch.architecturalDecisions &&
                  ch.architecturalDecisions.length > 0 && (
                    <div className="rationale-drawer" style={{ marginTop: 14 }}>
                      <div className="rationale-drawer-header">
                        <h4>
                          🏗️ Architectural Rationale — Why We Test NestJS This Way in Production
                        </h4>
                        <p>
                          Understanding why isolated IoC containers, spy assertions, and in-memory
                          Supertest pipelines prevent production regressions.
                        </p>
                      </div>
                      {ch.architecturalDecisions.map((d, idx) => (
                        <div key={idx} className="rationale-decision-card">
                          <div className="rationale-q">
                            <span className="rationale-num">Decision #{idx + 1}</span>
                            <h5>🤔 {d.question}</h5>
                          </div>
                          <div className="rationale-grid">
                            <div className="rationale-box anti-pattern">
                              <strong>❌ Common Testing Trap (The Anti-Pattern)</strong>
                              <p style={{ whiteSpace: 'pre-line' }}>{d.antiPattern}</p>
                            </div>
                            <div className="rationale-box technical-why">
                              <strong>⚙️ Technical &amp; Framework Reason</strong>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
