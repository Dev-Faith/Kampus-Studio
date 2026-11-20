'use client';

import React, { useState } from 'react';
import { highlightCodeHtml } from '../utils/highlightCode';
import type { PrismaChapter, PrismaSchemaConstruct } from '../types/studio';

interface PrismaMasteryViewProps {
  fullSchema: string;
  schemaExplorer: PrismaSchemaConstruct[];
  chapters: PrismaChapter[];
  onOpenInLiveIde: (conceptId: string) => void;
}

export function PrismaMasteryView({
  fullSchema,
  schemaExplorer,
  chapters,
  onOpenInLiveIde,
}: PrismaMasteryViewProps) {
  const [search, setSearch] = useState('');
  const [activeSchemaId, setActiveSchemaId] = useState<string>(
    schemaExplorer[0]?.id || 'schema-id-strategy',
  );
  const [showFullSchema, setShowFullSchema] = useState(false);
  const [openDecisionChapters, setOpenDecisionChapters] = useState<Record<string, boolean>>({
    'prisma-service-lifecycle': true,
    'prisma-find-where-operators': true,
    'prisma-select-vs-include-n1': true,
    'prisma-pagination-cursor-vs-offset': true,
    'prisma-writes-nested-upsert-atomic': true,
    'prisma-interactive-transactions': true,
    'prisma-error-handling-filter': true,
  });

  const q = search.trim().toLowerCase();
  const activeSchemaItem =
    schemaExplorer.find((s) => s.id === activeSchemaId) || schemaExplorer[0];

  const filteredChapters = chapters.filter((ch) => {
    if (!q) return true;
    const haystack = [
      ch.title,
      ch.subtitle,
      ch.category,
      ch.keyTakeaway,
      ch.prismaCode,
      ch.rawSqlOrJsCode,
      ...(ch.syntaxMap || []).map((t) => `${t.prismaToken} ${t.sqlOrJsEquivalent} ${t.purpose}`),
      ...(ch.decisions || []).map(
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
          <span className="sidebar-label">💎 PRISMA ORM MASTERY</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            placeholder="Search Prisma (select, include, upsert, $transaction, P2002...)"
          />
        </div>

        <div className="curriculum-tree">
          <div className="mod-group">
            <button
              type="button"
              className="mod-header"
              onClick={() => {
                const el = document.getElementById('prisma-schema-decompiler');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="mod-num">00</span>
              <span style={{ flex: 1 }}>Kampus schema.prisma Decompiler</span>
            </button>
            <div className="mod-sublist">
              {schemaExplorer.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`subconcept-item ${activeSchemaId === sc.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSchemaId(sc.id);
                    const el = document.getElementById('prisma-schema-decompiler');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <span>{sc.badge}</span>
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
                  const el = document.getElementById(`prisma-chapter-${ch.id}`);
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
              <span className="badge badge-accent">PRISMA ORM + POSTGRESQL ARCHITECTURE</span>
              <h2>💎 Mastering Prisma ORM Syntax &amp; Architectural Decisions in NestJS</h2>
              <p className="muted-text">
                Understand every Prisma construct in the <strong>Kampus PropTech</strong> data layer—how{' '}
                <code>schema.prisma</code> compiles to PostgreSQL DDL &amp; indexes, how{' '}
                <code>PrismaService</code> queries work under the hood, and <strong>why</strong> each
                pattern is chosen over dangerous alternatives.
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
                onClick={() => onOpenInLiveIde('prisma-queries-relations')}
              >
                ▶ Run Live Prisma Queries in IDE (12.1)
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => onOpenInLiveIde('prisma-transactions-atomic')}
              >
                ▶ Run Live Prisma $transaction in IDE (12.2)
              </button>
            </div>
          </div>
        </div>

        {/* INTERACTIVE SCHEMA.PRISMA DECOMPILER */}
        <div id="prisma-schema-decompiler" className="decompiler-card">
          <div className="decompiler-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3>
                  🗂️ Interactive <code>schema.prisma</code> Decompiler &amp; PostgreSQL DDL Explorer
                </h3>
                <p className="muted-text">
                  Click any Prisma schema attribute below to inspect the exact PostgreSQL SQL it
                  generates and the engineering reason behind the decision.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowFullSchema((v) => !v)}
              >
                {showFullSchema
                  ? '▾ Hide Full Kampus schema.prisma'
                  : '📄 View Full Kampus schema.prisma'}
              </button>
            </div>

            {showFullSchema && (
              <div className="syntax-code-pane" style={{ width: '100%', marginTop: 8 }}>
                <div className="syntax-code-header nest-hdr">
                  <span>prisma/schema.prisma (Complete Kampus PropTech Data Model)</span>
                  <span>Prisma Schema</span>
                </div>
                <pre className="syntax-code-pre">{fullSchema}</pre>
              </div>
            )}

            <div className="decompiler-pills" style={{ marginTop: 6 }}>
              {schemaExplorer.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`decompiler-pill ${sc.id === activeSchemaItem?.id ? 'active' : ''}`}
                  onClick={() => setActiveSchemaId(sc.id)}
                >
                  {sc.badge}
                </button>
              ))}
            </div>
          </div>

          {activeSchemaItem && (
            <div className="decompiler-body">
              <div style={{ marginBottom: 10 }}>
                <h4 style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {activeSchemaItem.title}
                </h4>
              </div>

              <div className="syntax-split-grid">
                <div className="syntax-code-pane">
                  <div className="syntax-code-header nest-hdr">
                    <span>Prisma Schema Declaration (schema.prisma)</span>
                    <span>Prisma</span>
                  </div>
                  <pre
                    className="syntax-code-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightCodeHtml(activeSchemaItem.prismaSnippet, 'prisma'),
                    }}
                  />
                </div>
                <div className="syntax-code-pane">
                  <div className="syntax-code-header vanilla-hdr">
                    <span>Generated PostgreSQL Migration DDL (SQL)</span>
                    <span>PostgreSQL</span>
                  </div>
                  <pre
                    className="syntax-code-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightCodeHtml(activeSchemaItem.sqlEquivalent, 'sql'),
                    }}
                  />
                </div>
              </div>

              <div className="rationale-drawer" style={{ marginTop: 12 }}>
                <div className="rationale-decision-card">
                  <div className="rationale-q">
                    <span className="rationale-num">Schema Decision</span>
                    <h5>🤔 Why Is It Designed This Way in schema.prisma?</h5>
                  </div>
                  <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {activeSchemaItem.whyDecision}
                  </p>
                  <div className="rationale-rule">
                    <strong>🏆 Best-Practice Rule:</strong> {activeSchemaItem.bestPractice}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PRISMA MASTERY CHAPTERS */}
        <div className="syntax-cards-container">
          {filteredChapters.map((ch) => {
            const isDecisionOpen = Boolean(openDecisionChapters[ch.id]);
            return (
              <div key={ch.id} id={`prisma-chapter-${ch.id}`} className="syntax-card">
                <div className="syntax-card-top">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className="badge badge-accent">Chapter {ch.number}</span>
                      <span className="badge badge-outline">{ch.category}</span>
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
                        {ch.decisions.length} Decisions)
                      </span>
                    </button>
                    {ch.sandboxConceptId && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => onOpenInLiveIde(ch.sandboxConceptId!)}
                      >
                        ▶ Open &amp; Run in Live IDE
                      </button>
                    )}
                  </div>
                </div>

                <div className="decompiler-takeaway" style={{ marginBottom: 12 }}>
                  <strong>💡 Core Takeaway:</strong> {ch.keyTakeaway}
                </div>

                <div className="syntax-split-grid">
                  <div className="syntax-code-pane">
                    <div className="syntax-code-header nest-hdr">
                      <span>Prisma Client in NestJS (Kampus PropTech)</span>
                      <span>TypeScript</span>
                    </div>
                    <pre
                      className="syntax-code-pre"
                      dangerouslySetInnerHTML={{
                        __html: highlightCodeHtml(ch.prismaCode, 'ts'),
                      }}
                    />
                  </div>
                  <div className="syntax-code-pane">
                    <div className="syntax-code-header vanilla-hdr">
                      <span>Generated PostgreSQL SQL / Anti-Pattern Comparison</span>
                      <span>SQL / JS</span>
                    </div>
                    <pre
                      className="syntax-code-pre"
                      dangerouslySetInnerHTML={{
                        __html: highlightCodeHtml(ch.rawSqlOrJsCode, 'sql'),
                      }}
                    />
                  </div>
                </div>

                {/* TOKEN BY TOKEN SYNTAX TABLE */}
                <table className="token-map-table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Prisma Client Syntax</th>
                      <th style={{ width: '30%' }}>Generated SQL / Engine Behavior</th>
                      <th>Exact Purpose &amp; Type-Safety Guarantee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ch.syntaxMap || []).map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <code className="nest-tok">{row.prismaToken}</code>
                        </td>
                        <td>
                          <code className="js-tok">{row.sqlOrJsEquivalent}</code>
                        </td>
                        <td>{row.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ARCHITECTURAL DECISIONS ("WHY?") DRAWER */}
                {isDecisionOpen && ch.decisions && ch.decisions.length > 0 && (
                  <div className="rationale-drawer" style={{ marginTop: 14 }}>
                    <div className="rationale-drawer-header">
                      <h4>
                        🏗️ Architectural Rationale — Why Prisma Is Used This Way in Production
                      </h4>
                      <p>
                        Understanding the database concurrency, connection pooling, and indexing
                        trade-offs behind every Prisma decision.
                      </p>
                    </div>
                    {ch.decisions.map((d, idx) => (
                      <div key={idx} className="rationale-decision-card">
                        <div className="rationale-q">
                          <span className="rationale-num">Decision #{idx + 1}</span>
                          <h5>🤔 {d.question}</h5>
                        </div>
                        <div className="rationale-grid">
                          <div className="rationale-box anti-pattern">
                            <strong>❌ Why Not Do It Directly? (The Anti-Pattern)</strong>
                            <p style={{ whiteSpace: 'pre-line' }}>{d.antiPattern}</p>
                          </div>
                          <div className="rationale-box technical-why">
                            <strong>⚙️ Technical &amp; Database Engine Reason</strong>
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
