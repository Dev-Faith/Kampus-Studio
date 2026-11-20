'use client';

import React from 'react';
import { useStudioStore } from '../store/useStudioStore';
import { highlightCodeHtml } from '../utils/highlightCode';
import type { DecoratorDecompilerItem, SyntaxChapter } from '../types/studio';

interface SyntaxRosettaViewProps {
  decompilerItems: DecoratorDecompilerItem[];
  chapters: SyntaxChapter[];
  onOpenInLiveIde: (conceptId: string) => void;
}

export function SyntaxRosettaView({
  decompilerItems,
  chapters,
  onOpenInLiveIde,
}: SyntaxRosettaViewProps) {
  const syntaxSearch = useStudioStore((s) => s.syntaxSearch);
  const setSyntaxSearch = useStudioStore((s) => s.setSyntaxSearch);
  const activeDecompilerId = useStudioStore((s) => s.activeDecompilerId);
  const setActiveDecompilerId = useStudioStore((s) => s.setActiveDecompilerId);

  const q = syntaxSearch.trim().toLowerCase();
  const activeDecompiler =
    decompilerItems.find((d) => d.id === activeDecompilerId) || decompilerItems[0];

  const filteredChapters = chapters
    .map((chapter) => ({
      ...chapter,
      items: (chapter.items || []).filter((item) => {
        if (!q) return true;
        const haystack = [
          chapter.title,
          item.title,
          item.mentalModel,
          item.nestjsCode,
          item.vanillaCode,
          ...(item.badges || []),
          ...(item.tokenMap || []).map((t) => `${t.nest} ${t.vanilla} ${t.meaning}`),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }),
    }))
    .filter((ch) => ch.items.length > 0);

  return (
    <section className="syntax-view">
      <aside className="syntax-sidebar">
        <div className="sidebar-header">
          <span className="sidebar-label">SYNTAX ROSETTA STONE</span>
          <input
            type="search"
            value={syntaxSearch}
            onChange={(e) => setSyntaxSearch(e.target.value)}
            className="search-input"
            placeholder="Search syntax (@Controller, pipe, readonly...)"
          />
        </div>
        <div className="curriculum-tree">
          {filteredChapters.map((chapter) => (
            <div key={chapter.id} className="mod-group">
              <button type="button" className="mod-header">
                <span className="mod-num">{chapter.number}</span>
                <span style={{ flex: 1 }}>{chapter.title}</span>
              </button>
              <div className="mod-sublist">
                {chapter.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="subconcept-item"
                    onClick={() => {
                      const el = document.getElementById(`syntax-card-${item.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className="syntax-main">
        <div className="syntax-hero">
          <span className="badge badge-accent">SYNTAX TRANSLATOR</span>
          <h2>NestJS &harr; Vanilla JavaScript &amp; Express Rosetta Stone</h2>
          <p className="muted-text">
            Every NestJS decorator, TypeScript keyword, DI token, and RxJS operator is just
            familiar Vanilla JavaScript under the hood. Compare them side-by-side below.
          </p>
        </div>

        {activeDecompiler && (
          <div className="decompiler-card">
            <div className="decompiler-header">
              <div>
                <h3>
                  Interactive Decorator Decompiler: What Does <code>@</code> Actually Execute in
                  Vanilla JS?
                </h3>
                <p className="muted-text">
                  Click any NestJS decorator below to see the exact plain JavaScript function that
                  runs when your file loads.
                </p>
              </div>
              <div className="decompiler-pills">
                {decompilerItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`decompiler-pill ${
                      item.id === activeDecompiler.id ? 'active' : ''
                    }`}
                    onClick={() => setActiveDecompilerId(item.id)}
                  >
                    {item.token}
                  </button>
                ))}
              </div>
            </div>

            <div className="decompiler-body">
              <div
                style={{
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span className="badge badge-outline">{activeDecompiler.kind}</span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  {activeDecompiler.summary}
                </span>
              </div>

              <div className="syntax-split-grid">
                <div className="syntax-code-pane">
                  <div className="syntax-code-header nest-hdr">
                    <span>NestJS / TypeScript Decorator Syntax</span>
                    <span>.ts</span>
                  </div>
                  <pre
                    className="syntax-code-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightCodeHtml(activeDecompiler.nestjsCode, 'ts'),
                    }}
                  />
                </div>
                <div className="syntax-code-pane">
                  <div className="syntax-code-header vanilla-hdr">
                    <span>What Vanilla JavaScript Actually Executes Under the Hood</span>
                    <span>.js</span>
                  </div>
                  <pre
                    className="syntax-code-pre"
                    dangerouslySetInnerHTML={{
                      __html: highlightCodeHtml(activeDecompiler.vanillaJsCode, 'js'),
                    }}
                  />
                </div>
              </div>

              <div className="decompiler-takeaway">
                <strong>💡 Key Mental Model:</strong> {activeDecompiler.takeaway}
              </div>
            </div>
          </div>
        )}

        <div className="syntax-cards-container">
          {filteredChapters.map((chapter) => (
            <div key={chapter.id} className="syntax-chapter-block">
              <div className="syntax-chapter-header">
                <span className="badge badge-accent">Chapter {chapter.number}</span>
                <h3>{chapter.title}</h3>
                <span className="muted-text">{chapter.subtitle}</span>
              </div>

              {chapter.items.map((item) => (
                <div key={item.id} id={`syntax-card-${item.id}`} className="syntax-card">
                  <div className="syntax-card-top">
                    <div>
                      <h4>{item.title}</h4>
                      <div className="syntax-badges">
                        {(item.badges || []).map((b, i) => (
                          <span
                            key={i}
                            className="badge badge-outline"
                            style={{ fontFamily: 'var(--font-mono)' }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>
                    {item.sandboxConceptId && (
                      <button
                        type="button"
                        className="btn btn-primary btn-xs"
                        onClick={() => onOpenInLiveIde(item.sandboxConceptId!)}
                      >
                        ▶ Open &amp; Run in Live IDE
                      </button>
                    )}
                  </div>

                  <p className="syntax-mental-model">{item.mentalModel}</p>

                  <div className="syntax-split-grid">
                    <div className="syntax-code-pane">
                      <div className="syntax-code-header nest-hdr">
                        <span>NestJS Syntax (Kampus PropTech)</span>
                        <span>TypeScript</span>
                      </div>
                      <pre
                        className="syntax-code-pre"
                        dangerouslySetInnerHTML={{
                          __html: highlightCodeHtml(item.nestjsCode, 'ts'),
                        }}
                      />
                    </div>
                    <div className="syntax-code-pane">
                      <div className="syntax-code-header vanilla-hdr">
                        <span>Familiar Vanilla JavaScript / Express Equivalent</span>
                        <span>Vanilla JS</span>
                      </div>
                      <pre
                        className="syntax-code-pre"
                        dangerouslySetInnerHTML={{
                          __html: highlightCodeHtml(item.vanillaCode, 'js'),
                        }}
                      />
                    </div>
                  </div>

                  <table className="token-map-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28%' }}>NestJS / TS Syntax</th>
                        <th style={{ width: '32%' }}>Vanilla JS / Express Equivalent</th>
                        <th>How It Works &amp; Why NestJS Uses It</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(item.tokenMap || []).map((row, idx) => (
                        <tr key={idx}>
                          <td>
                            <code className="nest-tok">{row.nest}</code>
                          </td>
                          <td>
                            <code className="js-tok">{row.vanilla}</code>
                          </td>
                          <td>{row.meaning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
