'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FoldVertical,
  GitBranch,
  Play,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  TestTube2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { highlightCodeHtml } from '../utils/highlightCode';
import type { InspectorTab, RequestPreset } from '../types/studio';

interface HttpSimulatorProps {
  presets: RequestPreset[];
  onSendRequest: () => void;
  onBurstRequest: () => void;
  onApplyPresetAndSend: (preset: RequestPreset) => void;
}

export function healJsonString(raw: string): { valid: boolean; healed: string; error?: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: true, healed: '' };
  try {
    const parsed = JSON.parse(trimmed);
    return { valid: true, healed: JSON.stringify(parsed, null, 2) };
  } catch (err: any) {
    let candidate = trimmed.replace(/,\s*([}\]])/g, '$1');
    const openBraces = (candidate.match(/\{/g) || []).length;
    const closeBraces = (candidate.match(/\}/g) || []).length;
    if (candidate.startsWith('{') && openBraces > closeBraces) {
      candidate = candidate.replace(/,\s*$/, '') + '\n' + '}'.repeat(openBraces - closeBraces);
    }
    try {
      const parsed = JSON.parse(candidate);
      return { valid: false, healed: JSON.stringify(parsed, null, 2), error: err?.message };
    } catch {
      try {
        const relaxed = candidate
          .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*)'/g, ': "$1"');
        const parsed = JSON.parse(relaxed);
        return { valid: false, healed: JSON.stringify(parsed, null, 2), error: err?.message };
      } catch {
        return { valid: false, healed: raw, error: err?.message || 'Invalid JSON syntax' };
      }
    }
  }
}

export function HttpSimulator({
  presets,
  onSendRequest,
  onBurstRequest,
  onApplyPresetAndSend,
}: HttpSimulatorProps) {
  const reqMethod = useStudioStore((s) => s.reqMethod);
  const setReqMethod = useStudioStore((s) => s.setReqMethod);
  const reqUrl = useStudioStore((s) => s.reqUrl);
  const setReqUrl = useStudioStore((s) => s.setReqUrl);
  const reqHeaders = useStudioStore((s) => s.reqHeaders);
  const setReqHeaders = useStudioStore((s) => s.setReqHeaders);
  const reqBody = useStudioStore((s) => s.reqBody);
  const setReqBody = useStudioStore((s) => s.setReqBody);
  const authPersona = useStudioStore((s) => s.authPersona);
  const setAuthPersona = useStudioStore((s) => s.setAuthPersona);
  const payloadDrawerOpen = useStudioStore((s) => s.payloadDrawerOpen);
  const setPayloadDrawerOpen = useStudioStore((s) => s.setPayloadDrawerOpen);
  const inspectorTab = useStudioStore((s) => s.inspectorTab);
  const setInspectorTab = useStudioStore((s) => s.setInspectorTab);
  const lastExecutionResult = useStudioStore((s) => s.lastExecutionResult);
  const testResults = useStudioStore((s) => s.testResults);
  const editorHeightPercent = useStudioStore((s) => s.editorHeightPercent);
  const setEditorHeightPercent = useStudioStore((s) => s.setEditorHeightPercent);
  const payloadHeight = useStudioStore((s) => s.payloadHeight);
  const setPayloadHeight = useStudioStore((s) => s.setPayloadHeight);
  const toggleSimulator = useStudioStore((s) => s.toggleSimulator);
  const stateVersion = useStudioStore((s) => s.stateVersion);
  const [copiedJson, setCopiedJson] = useState(false);

  const bodyStatus = useMemo(() => healJsonString(reqBody), [reqBody]);
  const headersStatus = useMemo(() => healJsonString(reqHeaders), [reqHeaders]);

  const sandboxState = useMemo(() => {
    if (typeof window === 'undefined' || !window.NestSandboxEngine) return null;
    const s = window.NestSandboxEngine.getState();
    const cacheEntries: any[] = [];
    for (const [k, v] of s.cache.entries()) {
      const ttlLeftSec = Math.max(0, Math.ceil((v.expiresAt - Date.now()) / 1000));
      cacheEntries.push({ key: k, ttlLeftSec, value: v.value });
    }
    const throttleEntries: any[] = [];
    for (const [k, v] of s.throttler.entries()) {
      const resetSec = Math.max(0, Math.ceil((v.expiresAt - Date.now()) / 1000));
      throttleEntries.push({ key: k, hits: v.hits, limit: v.limit, resetSec });
    }
    return {
      users: s.users,
      escrowWallets: s.escrowWallets,
      listings: s.listings,
      bookings: s.bookings,
      cacheEntries,
      throttleEntries,
      eventsLog: s.eventsLog,
      auditLogs: s.auditLogs,
      consoleLogs: s.consoleLogs,
    };
  }, [lastExecutionResult, testResults, stateVersion, inspectorTab]);

  const res = lastExecutionResult;
  const statusClass = !res
    ? 'status-idle'
    : res.status >= 500
      ? 'status-5xx'
      : res.status >= 400
        ? 'status-4xx'
        : 'status-2xx';

  const passedTestsCount = testResults.filter((r) => r.pass).length;

  const tabs: Array<{ id: InspectorTab; icon: React.ReactNode; label: string; badge?: React.ReactNode }> = [
    {
      id: 'response',
      icon: <Terminal size={13} strokeWidth={2} />,
      label: 'Response',
      badge: (
        <>
          <motion.span
            key={res ? `${res.status}-${stateVersion}` : 'idle'}
            initial={{ scale: 0.88, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className={`status-pill ${statusClass}`}
          >
            {res ? `${res.status} ${res.statusText || ''}`.trim() : 'Ready'}
          </motion.span>
          {res && <span className="muted-text tabular">{res.durationMs}ms</span>}
        </>
      ),
    },
    {
      id: 'pipeline',
      icon: <GitBranch size={13} strokeWidth={2} />,
      label: 'Pipeline',
      badge: <span className="badge-xs">{res?.pipeline?.length || 0}</span>,
    },
    {
      id: 'tests',
      icon: <TestTube2 size={13} strokeWidth={2} />,
      label: 'Tests',
      badge:
        testResults.length > 0 ? (
          <span className="badge-xs">
            {passedTestsCount}/{testResults.length}
          </span>
        ) : null,
    },
    {
      id: 'state',
      icon: <Database size={13} strokeWidth={2} />,
      label: 'State',
    },
  ];

  return (
    <div className="simulator-section" style={{ height: `${100 - editorHeightPercent}%` }}>
      <div className="request-bar">
        <div className="request-controls">
          <select
            className={`method-select method-${reqMethod.toLowerCase()}`}
            aria-label="HTTP Method"
            value={reqMethod}
            onChange={(e) => setReqMethod(e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            className="url-input"
            value={reqUrl}
            onChange={(e) => setReqUrl(e.target.value)}
            placeholder="/route/path?query=1"
          />
          <button type="button" className="btn btn-primary" onClick={onSendRequest}>
            <Play size={12} fill="currentColor" strokeWidth={2} />
            Send Request
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            title="Fire 5 rapid requests in a row to test Rate Limiting (429) and Caching (HIT/MISS)"
            onClick={onBurstRequest}
          >
            <Zap size={13} strokeWidth={2} />
            Burst 5x
          </button>
        </div>

        <div className="presets-row">
          <div className="presets-group">
            <span className="row-label">PRESETS</span>
            <div className="preset-chips">
              {presets.map((p, idx) => {
                const methodStr = (p.method || 'GET').toUpperCase();
                const cleanedLabel = p.label
                  .replace(/^(GET|POST|PATCH|PUT|DELETE)\s+/i, '')
                  .replace(new RegExp(`:\\s*${methodStr}\\s+`, 'i'), ': ');
                return (
                  <button
                    key={p.label + idx}
                    type="button"
                    className="preset-chip"
                    onClick={() => onApplyPresetAndSend(p)}
                  >
                    <span className={`preset-method-tag method-${methodStr.toLowerCase()}`}>
                      {methodStr}
                    </span>
                    <span>{cleanedLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="persona-group">
            <span className="row-label">PERSONA</span>
            <select
              className="persona-select"
              title="Automatically sets Authorization or x-api-key header"
              value={authPersona}
              onChange={(e) => setAuthPersona(e.target.value)}
            >
              <option value="none">Guest Student (No Auth Header)</option>
              <option value="user">Adaobi — Student (tier: basic)</option>
              <option value="moderator">Chidi — Landlord (tier: verified)</option>
              <option value="admin">Grace — Housing Officer (admin)</option>
              <option value="apikey">Partner Key (x-api-key)</option>
              <option value="expired">Expired Student JWT</option>
            </select>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setPayloadDrawerOpen(!payloadDrawerOpen)}
            >
              <SlidersHorizontal size={12} />
              Headers &amp; Body
              {!bodyStatus.valid && (
                <AlertTriangle size={12} style={{ color: 'var(--amber-fg)' }} />
              )}
            </button>
          </div>
        </div>

        {payloadDrawerOpen && (
          <div className="req-payload-drawer">
            <div className="payload-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="payload-label">Request Headers (JSON)</label>
                {headersStatus.valid ? (
                  <span style={{ fontSize: 10.5, color: 'var(--green-fg)' }}>Valid JSON</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-xs btn-secondary"
                    style={{ color: 'var(--amber-fg)' }}
                    onClick={() => setReqHeaders(headersStatus.healed)}
                  >
                    <Sparkles size={11} /> Auto-Fix JSON
                  </button>
                )}
              </div>
              <textarea
                className="payload-textarea"
                spellCheck={false}
                value={reqHeaders}
                onChange={(e) => setReqHeaders(e.target.value)}
                style={{ height: payloadHeight, minHeight: 44 }}
              />
            </div>

            <div className="payload-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="payload-label">Request Body (JSON)</label>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {!reqBody.trim() ? (
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Empty Body</span>
                  ) : bodyStatus.valid ? (
                    <span style={{ fontSize: 10.5, color: 'var(--green-fg)' }}>Valid JSON</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      style={{ color: 'var(--amber-fg)' }}
                      onClick={() => setReqBody(bodyStatus.healed)}
                      title="Automatically adds missing closing '}' or fixes trailing commas"
                    >
                      <AlertTriangle size={11} /> Fix JSON
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="payload-textarea"
                spellCheck={false}
                value={reqBody}
                onChange={(e) => setReqBody(e.target.value)}
                placeholder='{\n  "email": "ada@kampus.edu",\n  "name": "Adaobi"\n}'
                style={{
                  height: payloadHeight,
                  minHeight: 44,
                  borderColor: !bodyStatus.valid ? 'var(--amber-border)' : undefined,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Draggable Splitter directly above the Inspector Tabs */}
      <div
        className="resizer-h"
        title="Drag up/down to adjust Inspector height (double-click to reset)"
        onDoubleClick={() => {
          setPayloadHeight(68);
          setEditorHeightPercent(50);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const targetEl = e.currentTarget;
          targetEl.classList.add('dragging');
          document.body.classList.add('is-resizing-row');
          const startY = e.clientY;
          const startPayloadH = payloadHeight;
          const startEditorPct = editorHeightPercent;
          const wbEl = targetEl.closest('.workbench') as HTMLElement | null;
          const wbHeight = wbEl?.getBoundingClientRect().height || 700;

          const onMove = (ev: MouseEvent) => {
            const deltaY = ev.clientY - startY;
            if (payloadDrawerOpen) {
              setPayloadHeight(startPayloadH + deltaY);
            } else {
              const deltaPct = (deltaY / wbHeight) * 100;
              setEditorHeightPercent(Math.round(startEditorPct + deltaPct));
            }
          };
          const onUp = () => {
            targetEl.classList.remove('dragging');
            document.body.classList.remove('is-resizing-row');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      />

      <div className="inspector-dock">
        <div className="inspector-tabs" role="tablist">
          {tabs.map((tab) => {
            const isActive = inspectorTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`inspector-tab ${isActive ? 'active' : ''}`}
                onClick={() => setInspectorTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge}
                {isActive && (
                  <motion.span
                    layoutId="inspector-tab-indicator"
                    className="inspector-tab-underline"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
              </button>
            );
          })}

          <div className="inspector-tabs-actions">
            <button
              type="button"
              className="tb-icon-btn"
              title="Maximize output (shrink editor)"
              aria-label="Maximize output"
              onClick={() => {
                setEditorHeightPercent(24);
                setPayloadHeight(52);
              }}
            >
              <ArrowUpToLine size={13} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="tb-icon-btn"
              title="Balanced 50/50 split"
              aria-label="Balanced split"
              onClick={() => {
                setEditorHeightPercent(50);
                setPayloadHeight(68);
              }}
            >
              <FoldVertical size={13} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="tb-icon-btn"
              title="Maximize editor (shrink output)"
              aria-label="Maximize editor"
              onClick={() => setEditorHeightPercent(72)}
            >
              <ArrowDownToLine size={13} strokeWidth={2} />
            </button>
            <span className="tb-divider" aria-hidden="true" />
            <button
              type="button"
              className="tb-icon-btn tb-close"
              title="Close HTTP panel"
              aria-label="Close HTTP panel"
              onClick={toggleSimulator}
            >
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        </div>

        {inspectorTab === 'response' && (
          <div className="inspector-panel">
            <div
              className="resp-headers-bar"
              style={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(res?.headers || {}).map(([k, v]) => (
                  <span key={k} className="header-chip">
                    <strong>{k}:</strong> {String(v)}
                  </span>
                ))}
              </div>
              {res?.body !== undefined && res?.body !== null && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(JSON.stringify(res.body, null, 2))
                      .then(() => {
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 1500);
                      })
                      .catch(() => {});
                  }}
                >
                  {copiedJson ? <Check size={11} /> : <Copy size={11} />}
                  {copiedJson ? 'Copied' : 'Copy JSON'}
                </button>
              )}
            </div>
            <pre
              className="code-output"
              dangerouslySetInnerHTML={{
                __html: !res
                  ? '<span class="hl-comment">// Click "Send Request" or any Preset above to execute your NestJS code and inspect the response.</span>'
                  : res.body === null || res.body === undefined
                    ? '<span class="hl-comment">// 204 No Content (Empty Response Body)</span>'
                    : highlightCodeHtml(JSON.stringify(res.body, null, 2), 'json'),
              }}
            />
          </div>
        )}

        {inspectorTab === 'pipeline' && (
          <div className="inspector-panel">
            <div className="pipeline-steps-list">
              {(res?.pipeline || []).map((step, idx) => (
                <motion.div
                  key={`${stateVersion}-${idx}-${step.name}`}
                  className={`pipe-step status-${step.status}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="pipe-step-left">
                    <span className="pipe-stage-tag">
                      {idx + 1}. {step.stage}
                    </span>
                    <div>
                      <div className="pipe-step-name">{step.name}</div>
                      <div className="pipe-step-detail">{step.detail || ''}</div>
                    </div>
                  </div>
                  <span className="badge badge-outline tabular">{step.durationMs}ms</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {inspectorTab === 'tests' && (
          <div className="inspector-panel">
            <div className="test-results-list">
              {testResults.length === 0 ? (
                <p className="muted-text">
                  Click &quot;Verify&quot; to run the automated test suite against your solution.
                </p>
              ) : (
                testResults.map((r, idx) => (
                  <motion.div
                    key={`${stateVersion}-test-${idx}`}
                    className={`test-row ${r.pass ? 'pass' : 'fail'}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.16 }}
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
                ))
              )}
            </div>
          </div>
        )}

        {inspectorTab === 'state' && sandboxState && (
          <div className="inspector-panel">
            <div className="state-grid">
              <div className="state-card">
                <h4>
                  Users ({sandboxState.users.length}) &amp; Escrow Wallets
                </h4>
                <pre>
                  {JSON.stringify(
                    {
                      escrowWallets: sandboxState.escrowWallets,
                      users: sandboxState.users,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
              <div className="state-card">
                <h4>
                  Hostel Listings ({sandboxState.listings.length}) &amp; Rent Bookings (
                  {sandboxState.bookings.length})
                </h4>
                <pre>
                  {JSON.stringify(
                    {
                      listings: sandboxState.listings,
                      bookings: sandboxState.bookings,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
              <div className="state-card">
                <h4>
                  CACHE_MANAGER ({sandboxState.cacheEntries.length}) &amp; Throttler (
                  {sandboxState.throttleEntries.length})
                </h4>
                <pre>
                  {JSON.stringify(
                    {
                      cache: sandboxState.cacheEntries,
                      rateLimits: sandboxState.throttleEntries,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
              <div className="state-card">
                <h4>
                  Domain Events ({sandboxState.eventsLog.length}) &amp; Audit Logs (
                  {sandboxState.auditLogs.length})
                </h4>
                <pre>
                  {JSON.stringify(
                    {
                      events: sandboxState.eventsLog,
                      auditLogs: sandboxState.auditLogs,
                      logs: sandboxState.consoleLogs,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
