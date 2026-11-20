'use client';

import React, { useState } from 'react';
import { highlightCodeHtml } from '../utils/highlightCode';
import type { PrismaChapter, PrismaSchemaConstruct } from '../types/studio';

interface MongooseMasteryViewProps {
  fullSchema: string;
  schemaExplorer: PrismaSchemaConstruct[];
  chapters: PrismaChapter[];
  onOpenInLiveIde: (conceptId: string) => void;
}

export function MongooseMasteryView({
  fullSchema,
  schemaExplorer,
  chapters,
  onOpenInLiveIde,
}: MongooseMasteryViewProps) {
  const [search, setSearch] = useState('');
  const [activeSchemaId, setActiveSchemaId] = useState<string>(
    schemaExplorer[0]?.id || 'mongo-embed-vs-ref',
  );
  const [showFullSchema, setShowFullSchema] = useState(false);
  const [openDecisionChapters, setOpenDecisionChapters] = useState<Record<string, boolean>>({
    'mongoose-di-injectmodel': true,
    'mongoose-lean-vs-hydrated': true,
    'mongoose-queries-projections-populate': true,
    'mongoose-findoneandupdate-traps': true,
    'mongoose-atomic-operators': true,
    'mongoose-aggregation-pipeline': true,
    'mongoose-transactions-errors': true,
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
          <span className="sidebar-label">Mongoose ODM Mastery</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            placeholder="Search Mongoose (@Prop, .lean, populate, $inc, $addToSet, E11000...)"
          />
        </div>

        <div className="curriculum-tree">
          <div className="mod-group">
            <button
              type="button"
              className="mod-header"
              onClick={() => {
                const el = document.getElementById('mongoose-schema-decompiler');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              <span className="mod-num">00</span>
              <span style={{ flex: 1 }}>Kampus @Schema / @Prop Decompiler</span>
            </button>
            <div className="mod-sublist">
              {schemaExplorer.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  className={`subconcept-item ${activeSchemaId === sc.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSchemaId(sc.id);
                    const el = document.getElementById('mongoose-schema-decompiler');
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
                  const el = document.getElementById(`mongoose-chapter-${ch.id}`);
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
              <span className="badge badge-accent">MONGOOSE ODM + MONGODB ARCHITECTURE</span>
              <h2>Mastering Mongoose (@nestjs/mongoose) Syntax &amp; Architectural Decisions</h2>
              <p className="muted-text">
                Master every Mongoose construct in the <strong>Kampus PropTech</strong> document layer—when
                to embed vs reference (`ObjectId`), why <code>.lean().exec()</code> and{' '}
                <code>{'{ new: true, runValidators: true }'}</code> are critical, and how filter-guarded{' '}
                <code>$inc</code> / <code>$addToSet</code> operators eliminate race conditions.
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
                onClick={() => onOpenInLiveIde('mongoose-schemas-queries-lean')}
              >
                ▶ Run Live Mongoose Queries in IDE (13.1)
              </button>
              <button
                type="button"
                className="btn btn-success btn-sm"
                onClick={() => onOpenInLiveIde('mongoose-atomic-operators-upsert')}
              >
                ▶ Run Live Mongoose Atomic Ops in IDE (13.2)
              </button>
            </div>
          </div>
        </div>

        {/* INTERACTIVE @SCHEMA / @PROP DECOMPILER */}
        <div id="mongoose-schema-decompiler" className="decompiler-card">
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
                  🗂️ Interactive <code>@Schema()</code> &amp; <code>@Prop()</code> Decompiler &amp;
                  MongoDB BSON/Index Explorer
                </h3>
                <p className="muted-text">
                  Click any Mongoose schema pattern below to see the exact MongoDB BSON/Index behavior
                  and the architectural reason behind the decision.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setShowFullSchema((v) => !v)}
              >
                {showFullSchema
                  ? '▾ Hide Full Kampus Mongoose Schemas'
                  : '📄 View Full Kampus Mongoose Schemas'}
              </button>
            </div>

            {showFullSchema && (
              <div className="syntax-code-pane" style={{ width: '100%', marginTop: 8 }}>
                <div className="syntax-code-header nest-hdr">
                  <span>kampus-mongoose.schemas.ts (Complete @nestjs/mongoose Data Model)</span>
                  <span>TypeScript</span>
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
                    <span>@nestjs/mongoose Schema Declaration (.ts)</span>
                    <span>TypeScript</span>
                  </div>
                  <pre
                    className="syntax-code-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightCodeHtml(activeSchemaItem.prismaSnippet, 'ts'),
                    }}
                  />
                </div>
                <div className="syntax-code-pane">
                  <div className="syntax-code-header vanilla-hdr">
                    <span>MongoDB BSON Storage &amp; Index Behavior</span>
                    <span>MongoDB</span>
                  </div>
                  <pre
                    className="syntax-code-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightCodeHtml(activeSchemaItem.sqlEquivalent, 'ts'),
                    }}
                  />
                </div>
              </div>

              <div className="rationale-drawer" style={{ marginTop: 12 }}>
                <div className="rationale-decision-card">
                  <div className="rationale-q">
                    <span className="rationale-num">Schema Decision</span>
                    <h5>🤔 Why Is It Modeled This Way in Mongoose &amp; MongoDB?</h5>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.6,
                      color: 'var(--text-secondary)',
                      marginBottom: 8,
                    }}
                  >
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

        {/* MONGOOSE MASTERY CHAPTERS */}
        <div className="syntax-cards-container">
          {filteredChapters.map((ch) => {
            const isDecisionOpen = Boolean(openDecisionChapters[ch.id]);
            return (
              <div key={ch.id} id={`mongoose-chapter-${ch.id}`} className="syntax-card">
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
                      <span>@nestjs/mongoose in NestJS (Kampus PropTech)</span>
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
                      <span>MongoDB Wire Behavior / Anti-Pattern Comparison</span>
                      <span>MongoDB / JS</span>
                    </div>
                    <pre
                      className="syntax-code-pre"
                      dangerouslySetInnerHTML={{
                        __html: highlightCodeHtml(ch.rawSqlOrJsCode, 'ts'),
                      }}
                    />
                  </div>
                </div>

                {/* TOKEN BY TOKEN SYNTAX TABLE */}
                <table className="token-map-table" style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Mongoose / @nestjs/mongoose Syntax</th>
                      <th style={{ width: '30%' }}>MongoDB Driver / Engine Equivalent</th>
                      <th>Exact Purpose &amp; Architectural Guarantee</th>
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
                        🏗️ Architectural Rationale — Why Mongoose Is Used This Way in Production
                      </h4>
                      <p>
                        Understanding the V8 hydration cost, WiredTiger single-document atomicity, and
                        B-Tree indexing trade-offs behind every Mongoose decision.
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
                            <strong>⚙️ Technical &amp; MongoDB Engine Reason</strong>
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
