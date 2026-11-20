/**
 * NestJS Studio — Main IDE & Interactive Trainer Controller
 */
(function () {
  'use strict';

  const STORAGE_KEY_PROGRESS = 'nestjs_studio_completed_v1';
  const STORAGE_KEY_BUFFERS = 'kampus_nestjs_studio_buffers_v3';
  const STORAGE_KEY_UI = 'kampus_nestjs_studio_ui_v3';
  const curriculum = window.NEST_CURRICULUM || [];
  const sandboxTemplates = window.NEST_SANDBOX_TEMPLATES || [];

  // Flatten all subconcepts for linear Prev/Next navigation
  const allSubconcepts = [];
  for (const mod of curriculum) {
    for (const sub of mod.subconcepts || []) {
      allSubconcepts.push({ ...sub, moduleId: mod.id, moduleTitle: mod.title, moduleNumber: mod.number });
    }
  }

  // Application UI State
  const state = {
    mode: 'trainer', // 'trainer' | 'sandbox' | 'cheatsheet' | 'syntax'
    trainerTab: 'learn', // 'learn' | 'exercise'
    inspectorTab: 'response', // 'response' | 'pipeline' | 'tests' | 'state'
    currentSubconceptId: allSubconcepts[0]?.id || '',
    currentTemplateId: sandboxTemplates[0]?.id || '',
    files: [], // Array<{ name: string, code: string }>
    activeFileIndex: 0,
    completedIds: new Set(loadCompletedIds()),
    savedBuffers: loadSavedBuffers(), // Record<string, Array<{ name, code }>>
    sidebarCollapsed: false,
    trainerCollapsed: false,
    sidebarWidth: 270,
    trainerWidth: 410,
    editorHeightPct: 50,
    payloadHeight: 68,
    monacoEditor: null,
  };

  function loadCompletedIds() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS) || '[]');
    } catch {
      return [];
    }
  }

  function saveCompletedIds() {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify([...state.completedIds]));
    } catch {
      // ignore storage errors
    }
  }

  function loadSavedBuffers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_BUFFERS) || '{}') || {};
    } catch {
      return {};
    }
  }

  function getActiveBufferKey() {
    if (state.mode === 'sandbox') {
      return `sandbox:${state.currentTemplateId}`;
    }
    return `trainer:${state.currentSubconceptId}:${state.trainerTab}`;
  }

  function persistCurrentBufferToStorage() {
    try {
      const key = getActiveBufferKey();
      state.savedBuffers[key] = state.files.map((f) => ({ name: f.name, code: f.code }));
      localStorage.setItem(STORAGE_KEY_BUFFERS, JSON.stringify(state.savedBuffers));
      if (el.persistSavedBadge) {
        el.persistSavedBadge.textContent = '● Auto-Saved';
        el.persistSavedBadge.style.color = '#4ade80';
      }
    } catch {
      // ignore storage quota errors
    }
  }

  function saveUiLocation() {
    try {
      const payload = {
        mode: state.mode,
        sub: state.currentSubconceptId,
        tab: state.trainerTab,
        tpl: state.currentTemplateId,
        sidebarCollapsed: state.sidebarCollapsed,
        trainerCollapsed: state.trainerCollapsed,
        sidebarWidth: state.sidebarWidth,
        trainerWidth: state.trainerWidth,
        editorHeightPct: state.editorHeightPct,
        payloadHeight: state.payloadHeight,
      };
      localStorage.setItem(STORAGE_KEY_UI, JSON.stringify(payload));
      const hash = `#mode=${encodeURIComponent(state.mode)}&sub=${encodeURIComponent(state.currentSubconceptId)}&tab=${encodeURIComponent(state.trainerTab)}`;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', hash);
      }
    } catch {
      // ignore
    }
  }

  // DOM References
  const el = {
    workspaceMain: document.getElementById('workspace-main'),
    cheatsheetView: document.getElementById('cheatsheet-view'),
    syntaxView: document.getElementById('syntax-view'),
    syntaxSearch: document.getElementById('syntax-search'),
    syntaxNavTree: document.getElementById('syntax-nav-tree'),
    decompilerPills: document.getElementById('decompiler-pills'),
    decompilerBody: document.getElementById('decompiler-body'),
    syntaxCardsContainer: document.getElementById('syntax-cards-container'),
    prismaView: document.getElementById('prisma-view'),
    prismaSearch: document.getElementById('prisma-search'),
    prismaNavTree: document.getElementById('prisma-nav-tree'),
    prismaSchemaPills: document.getElementById('prisma-schema-pills'),
    prismaSchemaBody: document.getElementById('prisma-schema-body'),
    prismaCardsContainer: document.getElementById('prisma-cards-container'),
    toggleFullPrismaSchemaBtn: document.getElementById('toggle-full-prisma-schema-btn'),
    fullPrismaSchemaBox: document.getElementById('full-prisma-schema-box'),
    fullPrismaSchemaPre: document.getElementById('full-prisma-schema-pre'),
    prismaTryQueriesBtn: document.getElementById('prisma-try-queries-btn'),
    prismaTryTxBtn: document.getElementById('prisma-try-tx-btn'),
    mongooseView: document.getElementById('mongoose-view'),
    mongooseSearch: document.getElementById('mongoose-search'),
    mongooseNavTree: document.getElementById('mongoose-nav-tree'),
    mongooseSchemaPills: document.getElementById('mongoose-schema-pills'),
    mongooseSchemaBody: document.getElementById('mongoose-schema-body'),
    mongooseCardsContainer: document.getElementById('mongoose-cards-container'),
    toggleFullMongooseSchemaBtn: document.getElementById('toggle-full-mongoose-schema-btn'),
    fullMongooseSchemaBox: document.getElementById('full-mongoose-schema-box'),
    fullMongooseSchemaPre: document.getElementById('full-mongoose-schema-pre'),
    mongooseTryQueriesBtn: document.getElementById('mongoose-try-queries-btn'),
    mongooseTryAtomicBtn: document.getElementById('mongoose-try-atomic-btn'),
    testingView: document.getElementById('testing-view'),
    testingSearch: document.getElementById('testing-search'),
    testingNavTree: document.getElementById('testing-nav-tree'),
    testingHarnessPills: document.getElementById('testing-harness-pills'),
    testingHarnessBody: document.getElementById('testing-harness-body'),
    testingCardsContainer: document.getElementById('testing-cards-container'),
    toggleFullTestingSpecBtn: document.getElementById('toggle-full-testing-spec-btn'),
    fullTestingSpecBox: document.getElementById('full-testing-spec-box'),
    fullTestingSpecPre: document.getElementById('full-testing-spec-pre'),
    testingTryUnitBtn: document.getElementById('testing-try-unit-btn'),
    testingTryE2eBtn: document.getElementById('testing-try-e2e-btn'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
    toggleTrainerBtn: document.getElementById('toggle-trainer-btn'),
    progressText: document.getElementById('progress-text'),
    resetStateBtn: document.getElementById('reset-state-btn'),
    persistSavedBadge: document.getElementById('persist-saved-badge'),
    headersJsonBadge: document.getElementById('headers-json-badge'),
    bodyJsonBadge: document.getElementById('body-json-badge'),
    resizerSidebar: document.getElementById('resizer-sidebar'),
    resizerTrainer: document.getElementById('resizer-trainer'),
    resizerWorkbench: document.getElementById('resizer-workbench'),
    resizerInspector: document.getElementById('resizer-inspector'),
    workbench: document.getElementById('workbench'),
    simulatorSection: document.getElementById('simulator-section'),
    expandInspectorBtn: document.getElementById('expand-inspector-btn'),
    balanceSplitBtn: document.getElementById('balance-split-btn'),
    expandEditorBtn: document.getElementById('expand-editor-btn'),

    sidebarTrainerView: document.getElementById('sidebar-trainer-view'),
    sidebarSandboxView: document.getElementById('sidebar-sandbox-view'),
    conceptSearch: document.getElementById('concept-search'),
    curriculumTree: document.getElementById('curriculum-tree'),
    sandboxTemplateList: document.getElementById('sandbox-template-list'),
    sandboxFileList: document.getElementById('sandbox-file-list'),
    addFileBtn: document.getElementById('add-file-btn'),

    trainerPane: document.getElementById('trainer-pane'),
    conceptCodeBadge: document.getElementById('concept-code-badge'),
    conceptDifficultyBadge: document.getElementById('concept-difficulty-badge'),
    conceptStatusBadge: document.getElementById('concept-status-badge'),
    conceptTitle: document.getElementById('concept-title'),
    conceptSummary: document.getElementById('concept-summary'),
    tabLearnBtn: document.getElementById('tab-learn-btn'),
    tabExerciseBtn: document.getElementById('tab-exercise-btn'),
    trainerLearnContent: document.getElementById('trainer-learn-content'),
    trainerExerciseContent: document.getElementById('trainer-exercise-content'),
    lifecycleMiniBar: document.getElementById('lifecycle-mini-bar'),
    conceptTheoryHtml: document.getElementById('concept-theory-html'),
    toggleRationaleBtn: document.getElementById('toggle-rationale-btn'),
    rationaleChevron: document.getElementById('rationale-chevron'),
    conceptRationaleDrawer: document.getElementById('concept-rationale-drawer'),
    loadExampleBtn: document.getElementById('load-example-btn'),
    startExerciseCta: document.getElementById('start-exercise-cta'),

    exerciseTitle: document.getElementById('exercise-title'),
    exercisePrompt: document.getElementById('exercise-prompt'),
    runExerciseBtn: document.getElementById('run-exercise-btn'),
    loadStarterBtn: document.getElementById('load-starter-btn'),
    toggleHintBtn: document.getElementById('toggle-hint-btn'),
    loadSolutionBtn: document.getElementById('load-solution-btn'),
    exerciseHintsBox: document.getElementById('exercise-hints-box'),
    exerciseInlineResults: document.getElementById('exercise-inline-results'),
    prevConceptBtn: document.getElementById('prev-concept-btn'),
    nextConceptBtn: document.getElementById('next-concept-btn'),
    conceptPositionLabel: document.getElementById('concept-position-label'),

    fileTabs: document.getElementById('file-tabs'),
    codeModeIndicator: document.getElementById('code-mode-indicator'),
    quickRunBtn: document.getElementById('quick-run-btn'),
    quickVerifyBtn: document.getElementById('quick-verify-btn'),
    monacoMount: document.getElementById('monaco-mount'),
    fallbackEditor: document.getElementById('fallback-editor'),

    reqMethod: document.getElementById('req-method'),
    reqUrl: document.getElementById('req-url'),
    sendReqBtn: document.getElementById('send-req-btn'),
    burstReqBtn: document.getElementById('burst-req-btn'),
    presetChips: document.getElementById('preset-chips'),
    authPersonaSelect: document.getElementById('auth-persona-select'),
    toggleReqPayloadBtn: document.getElementById('toggle-req-payload-btn'),
    reqPayloadDrawer: document.getElementById('req-payload-drawer'),
    reqHeadersInput: document.getElementById('req-headers-input'),
    reqBodyInput: document.getElementById('req-body-input'),

    inspectorTabs: document.querySelectorAll('.inspector-tab'),
    respStatusBadge: document.getElementById('resp-status-badge'),
    respTimeBadge: document.getElementById('resp-time-badge'),
    pipelineCountBadge: document.getElementById('pipeline-count-badge'),
    testsCountBadge: document.getElementById('tests-count-badge'),
    outResponse: document.getElementById('out-response'),
    outPipeline: document.getElementById('out-pipeline'),
    outTests: document.getElementById('out-tests'),
    outState: document.getElementById('out-state'),
    respHeadersBar: document.getElementById('resp-headers-bar'),
    respBodyPre: document.getElementById('resp-body-pre'),
    pipelineStepsList: document.getElementById('pipeline-steps-list'),
    testResultsList: document.getElementById('test-results-list'),
    stateInspectorGrid: document.getElementById('state-inspector-grid'),
  };

  // ---------------------------------------------------------------------------
  // 1. Curriculum Sidebar & Navigation
  // ---------------------------------------------------------------------------
  function getActiveSubconcept() {
    return allSubconcepts.find((s) => s.id === state.currentSubconceptId) || allSubconcepts[0];
  }

  function updateProgressHeader() {
    el.progressText.textContent = `${state.completedIds.size} / ${allSubconcepts.length} Exercises Passed`;
  }

  function renderCurriculumTree(filterText = '') {
    const q = filterText.trim().toLowerCase();
    el.curriculumTree.innerHTML = '';

    for (const mod of curriculum) {
      const matchingSubs = (mod.subconcepts || []).filter(
        (s) =>
          !q ||
          s.title.toLowerCase().includes(q) ||
          s.summary.toLowerCase().includes(q) ||
          mod.title.toLowerCase().includes(q),
      );
      if (matchingSubs.length === 0) continue;

      const group = document.createElement('div');
      group.className = 'mod-group';

      const header = document.createElement('button');
      header.className = 'mod-header';
      header.innerHTML = `
        <span class="mod-num">${mod.number}</span>
        <span style="flex:1">${escapeHtml(mod.title)}</span>
      `;

      const sublist = document.createElement('div');
      sublist.className = 'mod-sublist';

      for (const sub of matchingSubs) {
        const btn = document.createElement('button');
        btn.className = 'subconcept-item' + (sub.id === state.currentSubconceptId ? ' active' : '');
        const done = state.completedIds.has(sub.id);
        btn.innerHTML = `
          <span><span class="sub-code">${sub.code}</span>${escapeHtml(sub.title)}</span>
          ${done ? '<span class="sub-check" title="Exercise Completed">✓</span>' : ''}
        `;
        btn.addEventListener('click', () => selectSubconcept(sub.id));
        sublist.appendChild(btn);
      }

      header.addEventListener('click', () => {
        sublist.classList.toggle('hidden');
      });

      group.appendChild(header);
      group.appendChild(sublist);
      el.curriculumTree.appendChild(group);
    }
  }

  function highlightLifecycleMiniBar(moduleId) {
    const map = {
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
    const activeSet = new Set(map[moduleId] || ['handler']);
    el.lifecycleMiniBar.querySelectorAll('.lc-node').forEach((node) => {
      node.classList.toggle('active', activeSet.has(node.getAttribute('data-lc')));
    });
  }

  function selectSubconcept(subId, initialTrainerTab = 'learn') {
    state.currentSubconceptId = subId;
    const sub = getActiveSubconcept();
    if (!sub) return;

    const idx = allSubconcepts.findIndex((s) => s.id === sub.id);
    el.conceptCodeBadge.textContent = `${sub.code} • ${sub.moduleTitle}`;
    el.conceptDifficultyBadge.textContent = sub.difficulty || 'Intermediate';
    el.conceptStatusBadge.classList.toggle('hidden', !state.completedIds.has(sub.id));
    el.conceptTitle.textContent = sub.title;
    el.conceptSummary.textContent = sub.summary;
    el.conceptTheoryHtml.innerHTML = sub.theory;
    highlightLifecycleMiniBar(sub.moduleId);

    // Populate Detailed Architectural Rationale Drawer
    if (el.conceptRationaleDrawer) {
      const decisions =
        sub.architecturalDecisions ||
        (window.NEST_ARCHITECTURAL_RATIONALE && window.NEST_ARCHITECTURAL_RATIONALE[sub.id]) ||
        [];
      const html =
        sub.deepDiveHtml ||
        (window.renderArchitecturalRationaleHtml
          ? window.renderArchitecturalRationaleHtml(decisions)
          : '');
      el.conceptRationaleDrawer.innerHTML = html;
      el.conceptRationaleDrawer.classList.add('hidden');
      if (el.toggleRationaleBtn) {
        el.toggleRationaleBtn.querySelector('span').textContent =
          `🔬 Show Detailed Explanation (${decisions.length} Architectural Decisions)`;
      }
      if (el.rationaleChevron) {
        el.rationaleChevron.textContent = '▾';
      }
    }

    // Exercise pane
    if (sub.exercise) {
      el.exerciseTitle.textContent = sub.exercise.title;
      el.exercisePrompt.innerHTML = sub.exercise.prompt;
      el.exerciseHintsBox.classList.add('hidden');
      el.exerciseHintsBox.innerHTML =
        '<strong>Hints:</strong><ul>' +
        (sub.exercise.hints || []).map((h) => `<li>${escapeHtml(h)}</li>`).join('') +
        '</ul>';
      el.exerciseInlineResults.innerHTML = '';
    }

    // Footer Prev / Next
    el.conceptPositionLabel.textContent = `${idx + 1} of ${allSubconcepts.length}`;
    el.prevConceptBtn.disabled = idx <= 0;
    el.nextConceptBtn.disabled = idx >= allSubconcepts.length - 1;

    // Load example or exercise files & matching presets
    setTrainerTab(initialTrainerTab, true);
    renderCurriculumTree(el.conceptSearch.value);
  }

  function buildExercisePresets(sub) {
    if (!sub?.exercise?.tests) return sub?.presets || [];
    return sub.exercise.tests.map((t, idx) => {
      const req = Array.isArray(t.steps) ? t.steps[0] : t.request;
      return {
        label: `Ex Test ${idx + 1}: ${req?.method || 'GET'} ${req?.url || '/'}`,
        method: req?.method || 'GET',
        url: req?.url || '/',
        headers: req?.headers || {},
        body: req?.body !== undefined ? req.body : '',
      };
    });
  }

  function setTrainerTab(tab, reloadFiles = false) {
    state.trainerTab = tab;
    const sub = getActiveSubconcept();
    el.tabLearnBtn.classList.toggle('active', tab === 'learn');
    el.tabExerciseBtn.classList.toggle('active', tab === 'exercise');
    el.trainerLearnContent.classList.toggle('hidden', tab !== 'learn');
    el.trainerExerciseContent.classList.toggle('hidden', tab !== 'exercise');

    if (sub) {
      const activePresets = tab === 'exercise' ? buildExercisePresets(sub) : sub.presets || [];
      renderPresetChips(activePresets);
      if (activePresets[0]) {
        applyPresetToRequestBar(activePresets[0], false);
      }

      if (reloadFiles) {
        const bufKey = `trainer:${sub.id}:${tab}`;
        const saved = state.savedBuffers[bufKey];
        if (Array.isArray(saved) && saved.length > 0) {
          loadFilesIntoEditor(
            saved,
            tab === 'learn' ? 'Example Code (Saved)' : 'Exercise Work (Saved)',
            false,
          );
        } else if (tab === 'learn') {
          loadFilesIntoEditor(sub.exampleFiles || [], 'Example Code', false);
        } else if (sub.exercise) {
          loadFilesIntoEditor(sub.exercise.starterFiles || [], 'Exercise Starter', false);
        }
      }
      saveUiLocation();
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Multi-File Code Editor (Fallback + Progressive Monaco Upgrade)
  // ---------------------------------------------------------------------------
  function loadFilesIntoEditor(fileList, modeLabel, persistImmediately = true) {
    state.files = (fileList || []).map((f) => ({ name: f.name, code: f.code }));
    state.activeFileIndex = 0;
    el.codeModeIndicator.textContent = modeLabel || 'Workspace';
    renderFileTabs();
    syncEditorValueFromState();
    if (persistImmediately) {
      persistCurrentBufferToStorage();
    }
    if (state.mode === 'sandbox') {
      renderSandboxFileList();
    }
  }

  function saveCurrentEditorToState() {
    if (!state.files[state.activeFileIndex]) return;
    const currentCode = state.monacoEditor
      ? state.monacoEditor.getValue()
      : el.fallbackEditor.value;
    state.files[state.activeFileIndex].code = currentCode;
    persistCurrentBufferToStorage();
  }

  function syncEditorValueFromState() {
    const activeFile = state.files[state.activeFileIndex];
    const code = activeFile ? activeFile.code : '';
    el.fallbackEditor.value = code;
    if (state.monacoEditor && state.monacoEditor.getValue() !== code) {
      state.monacoEditor.setValue(code);
    }
  }

  function renderFileTabs() {
    el.fileTabs.innerHTML = '';
    state.files.forEach((f, idx) => {
      const btn = document.createElement('button');
      btn.className = 'file-tab' + (idx === state.activeFileIndex ? ' active' : '');
      btn.innerHTML = `<span>📄 ${escapeHtml(f.name)}</span>`;
      btn.addEventListener('click', () => {
        saveCurrentEditorToState();
        state.activeFileIndex = idx;
        renderFileTabs();
        syncEditorValueFromState();
        if (state.mode === 'sandbox') renderSandboxFileList();
      });
      el.fileTabs.appendChild(btn);
    });
  }

  el.fallbackEditor.addEventListener('input', () => {
    if (state.files[state.activeFileIndex]) {
      state.files[state.activeFileIndex].code = el.fallbackEditor.value;
      persistCurrentBufferToStorage();
    }
  });

  // Support Tab key indentation inside fallback editor
  el.fallbackEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = el.fallbackEditor.selectionStart;
      const end = el.fallbackEditor.selectionEnd;
      const val = el.fallbackEditor.value;
      el.fallbackEditor.value = val.substring(0, start) + '  ' + val.substring(end);
      el.fallbackEditor.selectionStart = el.fallbackEditor.selectionEnd = start + 2;
      saveCurrentEditorToState();
    }
  });

  // ---------------------------------------------------------------------------
  // 3. HTTP Request Simulator & Presets
  // ---------------------------------------------------------------------------
  function renderPresetChips(presets) {
    el.presetChips.innerHTML = '';
    for (const preset of presets) {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      chip.textContent = preset.label;
      chip.addEventListener('click', () => {
        applyPresetToRequestBar(preset, true);
      });
      el.presetChips.appendChild(chip);
    }
  }

  function applyPresetToRequestBar(preset, autoSend = false) {
    el.reqMethod.value = preset.method || 'GET';
    el.reqUrl.value = preset.url || '/';
    const headersObj = { ...(preset.headers || {}) };
    el.reqHeadersInput.value = JSON.stringify(headersObj, null, 2);
    el.reqBodyInput.value =
      typeof preset.body === 'object'
        ? JSON.stringify(preset.body, null, 2)
        : preset.body || '';

    // Sync persona dropdown display
    const auth = headersObj['Authorization'] || headersObj['authorization'] || '';
    if (auth === 'Bearer demo-student-jwt' || auth === 'Bearer demo-user-jwt') el.authPersonaSelect.value = 'user';
    else if (auth === 'Bearer demo-landlord-jwt' || auth === 'Bearer demo-mod-jwt') el.authPersonaSelect.value = 'moderator';
    else if (auth === 'Bearer demo-admin-jwt') el.authPersonaSelect.value = 'admin';
    else if (auth === 'Bearer demo-expired-jwt') el.authPersonaSelect.value = 'expired';
    else if (headersObj['x-api-key']) el.authPersonaSelect.value = 'apikey';
    else el.authPersonaSelect.value = 'none';

    if (autoSend) {
      void runCurrentRequest();
    }
  }

  el.authPersonaSelect.addEventListener('change', () => {
    let headers = {};
    try {
      headers = JSON.parse(el.reqHeadersInput.value || '{}');
    } catch {
      headers = {};
    }
    delete headers['Authorization'];
    delete headers['authorization'];

    const val = el.authPersonaSelect.value;
    if (val === 'user') headers['Authorization'] = 'Bearer demo-student-jwt';
    else if (val === 'moderator') headers['Authorization'] = 'Bearer demo-landlord-jwt';
    else if (val === 'admin') headers['Authorization'] = 'Bearer demo-admin-jwt';
    else if (val === 'expired') headers['Authorization'] = 'Bearer demo-expired-jwt';
    else if (val === 'apikey') headers['x-api-key'] = 'kampus-partner-key';

    el.reqHeadersInput.value = JSON.stringify(headers, null, 2);
  });

  el.toggleReqPayloadBtn.addEventListener('click', () => {
    el.reqPayloadDrawer.classList.toggle('hidden');
  });

  function checkAndHealJson(rawText, allowEmpty = false) {
    const trimmed = String(rawText || '').trim();
    if (!trimmed) {
      return allowEmpty
        ? { valid: true, healed: '' }
        : { valid: true, healed: '{}' };
    }
    try {
      JSON.parse(trimmed);
      return { valid: true, healed: trimmed };
    } catch {
      let candidate = trimmed.replace(/,\s*([}\]])/g, '$1');
      if (candidate.startsWith('{')) {
        const openCount = (candidate.match(/\{/g) || []).length;
        const closeCount = (candidate.match(/\}/g) || []).length;
        if (openCount > closeCount) {
          candidate = candidate.replace(/,\s*$/, '') + '\n' + '}'.repeat(openCount - closeCount);
        }
      }
      try {
        const parsed = JSON.parse(candidate);
        return {
          valid: false,
          error: "Missing '}' or trailing comma — Click to Fix JSON",
          healed: JSON.stringify(parsed, null, 2),
        };
      } catch {
        return {
          valid: false,
          error: 'Invalid JSON syntax — Click to Auto-Fix',
          healed: null,
        };
      }
    }
  }

  function updateJsonValidationBadges() {
    if (el.headersJsonBadge) {
      const hCheck = checkAndHealJson(el.reqHeadersInput.value, false);
      el.headersJsonBadge.textContent = hCheck.valid ? '✓ Valid JSON' : `⚠️ ${hCheck.error}`;
      el.headersJsonBadge.style.color = hCheck.valid ? '#4ade80' : '#fbbf24';
    }
    if (el.bodyJsonBadge) {
      const bCheck = checkAndHealJson(el.reqBodyInput.value, true);
      el.bodyJsonBadge.textContent = bCheck.valid
        ? el.reqBodyInput.value.trim()
          ? '✓ Valid JSON'
          : 'Empty Body'
        : `⚠️ ${bCheck.error}`;
      el.bodyJsonBadge.style.color = bCheck.valid ? '#4ade80' : '#fbbf24';
    }
  }

  el.reqHeadersInput.addEventListener('input', updateJsonValidationBadges);
  el.reqBodyInput.addEventListener('input', updateJsonValidationBadges);

  if (el.headersJsonBadge) {
    el.headersJsonBadge.addEventListener('click', () => {
      const hCheck = checkAndHealJson(el.reqHeadersInput.value, false);
      if (hCheck.healed !== null) {
        el.reqHeadersInput.value = hCheck.healed;
        updateJsonValidationBadges();
      }
    });
  }

  if (el.bodyJsonBadge) {
    el.bodyJsonBadge.addEventListener('click', () => {
      const bCheck = checkAndHealJson(el.reqBodyInput.value, true);
      if (bCheck.healed !== null) {
        el.reqBodyInput.value = bCheck.healed;
        updateJsonValidationBadges();
      }
    });
  }

  function buildRequestSpecFromInputs() {
    const hCheck = checkAndHealJson(el.reqHeadersInput.value, false);
    if (!hCheck.valid && hCheck.healed) {
      el.reqHeadersInput.value = hCheck.healed;
    }
    let headers = {};
    try {
      headers = JSON.parse(el.reqHeadersInput.value || '{}');
    } catch {
      headers = {};
    }

    // Auto-close missing '}' in Request Body JSON textarea if user forgot the closing brace
    const bCheck = checkAndHealJson(el.reqBodyInput.value, true);
    if (!bCheck.valid && bCheck.healed) {
      el.reqBodyInput.value = bCheck.healed;
    }
    updateJsonValidationBadges();

    return {
      method: el.reqMethod.value,
      url: el.reqUrl.value,
      headers,
      body: el.reqBodyInput.value,
    };
  }

  async function runCurrentRequest() {
    saveCurrentEditorToState();
    const spec = buildRequestSpecFromInputs();
    const res = await window.NestSandboxEngine.executeRequest(state.files, spec);
    renderExecutionResult(res);
    return res;
  }

  async function runBurstRequests(count = 5) {
    saveCurrentEditorToState();
    const spec = buildRequestSpecFromInputs();
    const results = [];
    for (let i = 0; i < count; i++) {
      const r = await window.NestSandboxEngine.executeRequest(state.files, spec);
      results.push({ attempt: i + 1, status: r.status, headers: r.headers, body: r.body, pipeline: r.pipeline });
    }
    const last = results[results.length - 1];
    renderExecutionResult({
      status: last.status,
      statusText: `Burst ${count}x Complete (Last: ${last.status})`,
      durationMs: results.length,
      headers: last.headers,
      body: {
        burstSummary: results.map((r) => ({
          attempt: r.attempt,
          status: r.status,
          rateLimitRemaining: r.headers['x-ratelimit-remaining'],
          cache: r.headers['x-cache'],
          response: r.body,
        })),
      },
      pipeline: last.pipeline,
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Render Output Dock (Response, Pipeline Trace, Tests, Sandbox State)
  // ---------------------------------------------------------------------------
  function renderExecutionResult(res) {
    // Status pill
    el.respStatusBadge.textContent = `${res.status} ${res.statusText || ''}`.trim();
    el.respStatusBadge.className =
      'status-pill ' +
      (res.status >= 500
        ? 'status-5xx'
        : res.status >= 400
          ? 'status-4xx'
          : 'status-2xx');
    el.respTimeBadge.textContent = `${res.durationMs}ms`;

    // Response Headers
    el.respHeadersBar.innerHTML = '';
    for (const [k, v] of Object.entries(res.headers || {})) {
      const span = document.createElement('span');
      span.className = 'header-chip';
      span.innerHTML = `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}`;
      el.respHeadersBar.appendChild(span);
    }

    // Response Body
    el.respBodyPre.textContent =
      res.body === null || res.body === undefined
        ? '// 204 No Content (Empty Response Body)'
        : JSON.stringify(res.body, null, 2);

    // Pipeline Lifecycle Trace
    const steps = res.pipeline || [];
    el.pipelineCountBadge.textContent = String(steps.length);
    el.pipelineStepsList.innerHTML = '';
    steps.forEach((step, idx) => {
      const row = document.createElement('div');
      row.className = `pipe-step status-${step.status}`;
      row.innerHTML = `
        <div class="pipe-step-left">
          <span class="pipe-stage-tag">${idx + 1}. ${escapeHtml(step.stage)}</span>
          <div>
            <div class="pipe-step-name">${escapeHtml(step.name)}</div>
            <div class="pipe-step-detail">${escapeHtml(step.detail || '')}</div>
          </div>
        </div>
        <span class="badge badge-outline">${step.durationMs}ms</span>
      `;
      el.pipelineStepsList.appendChild(row);
    });

    renderSandboxStatePanel();
  }

  function renderSandboxStatePanel() {
    const s = window.NestSandboxEngine.getState();
    const cacheEntries = [];
    for (const [k, v] of s.cache.entries()) {
      const ttlLeftSec = Math.max(0, Math.ceil((v.expiresAt - Date.now()) / 1000));
      cacheEntries.push({ key: k, ttlLeftSec, value: v.value });
    }
    const throttleEntries = [];
    for (const [k, v] of s.throttler.entries()) {
      const resetSec = Math.max(0, Math.ceil((v.expiresAt - Date.now()) / 1000));
      throttleEntries.push({ key: k, hits: v.hits, limit: v.limit, resetSec });
    }

    el.stateInspectorGrid.innerHTML = `
      <div class="state-card">
        <h4>Kampus DB: Users (${s.users.length}) &amp; Escrow Wallets</h4>
        <pre>${escapeHtml(JSON.stringify({ escrowWallets: s.escrowWallets, users: s.users }, null, 2))}</pre>
      </div>
      <div class="state-card">
        <h4>Kampus DB: Hostel Listings (${s.listings.length}) &amp; Rent Bookings (${s.bookings.length})</h4>
        <pre>${escapeHtml(JSON.stringify({ listings: s.listings, bookings: s.bookings }, null, 2))}</pre>
      </div>
      <div class="state-card">
        <h4>CACHE_MANAGER (${cacheEntries.length} keys) &amp; Throttler (${throttleEntries.length} keys)</h4>
        <pre>${escapeHtml(JSON.stringify({ cache: cacheEntries, rateLimits: throttleEntries }, null, 2))}</pre>
      </div>
      <div class="state-card">
        <h4>Domain Events (${s.eventsLog.length}) &amp; Safety Audit Logs (${s.auditLogs.length})</h4>
        <pre>${escapeHtml(JSON.stringify({ events: s.eventsLog, auditLogs: s.auditLogs, logs: s.consoleLogs }, null, 2))}</pre>
      </div>
    `;
  }

  function setInspectorTab(tabName) {
    state.inspectorTab = tabName;
    el.inspectorTabs.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-out') === tabName);
    });
    el.outResponse.classList.toggle('hidden', tabName !== 'response');
    el.outPipeline.classList.toggle('hidden', tabName !== 'pipeline');
    el.outTests.classList.toggle('hidden', tabName !== 'tests');
    el.outState.classList.toggle('hidden', tabName !== 'state');
    if (tabName === 'state') renderSandboxStatePanel();
  }

  // ---------------------------------------------------------------------------
  // 5. Automated Exercise Test Runner
  // ---------------------------------------------------------------------------
  async function runExerciseVerification() {
    saveCurrentEditorToState();
    const sub = getActiveSubconcept();
    if (!sub || !sub.exercise) return;

    const tests = sub.exercise.tests || [];
    const results = [];

    for (const t of tests) {
      window.NestSandboxEngine.resetState();
      let lastRes = null;
      const allResponses = [];

      if (Array.isArray(t.steps)) {
        for (const stepReq of t.steps) {
          lastRes = await window.NestSandboxEngine.executeRequest(state.files, stepReq);
          allResponses.push(lastRes);
        }
      } else {
        lastRes = await window.NestSandboxEngine.executeRequest(state.files, t.request);
        allResponses.push(lastRes);
      }

      const currentState = window.NestSandboxEngine.getState();
      let verdict = { pass: false, reason: 'Assertion failed' };
      try {
        verdict = t.check(lastRes, currentState, allResponses) || verdict;
      } catch (err) {
        verdict = { pass: false, reason: err.message };
      }

      results.push({
        name: t.name,
        pass: Boolean(verdict.pass),
        reason: verdict.reason,
        lastRes,
      });
    }

    const passedCount = results.filter((r) => r.pass).length;
    const allPassed = passedCount === results.length && results.length > 0;

    if (allPassed) {
      state.completedIds.add(sub.id);
      saveCompletedIds();
      updateProgressHeader();
      el.conceptStatusBadge.classList.remove('hidden');
      renderCurriculumTree(el.conceptSearch.value);
    }

    el.testsCountBadge.textContent = `${passedCount}/${results.length}`;
    const html = results
      .map(
        (r) => `
        <div class="test-row ${r.pass ? 'pass' : 'fail'}">
          <div style="display:flex; justify-content:space-between; font-weight:600;">
            <span>${r.pass ? '✓ PASS' : '✗ FAIL'} — ${escapeHtml(r.name)}</span>
            <span class="badge badge-outline">HTTP ${r.lastRes?.status ?? '-'}</span>
          </div>
          ${!r.pass && r.reason ? `<div class="muted-text" style="color:#fca5a5">${escapeHtml(r.reason)}</div>` : ''}
        </div>
      `,
      )
      .join('');

    el.testResultsList.innerHTML = html;
    el.exerciseInlineResults.innerHTML = html;

    if (results[0]?.lastRes) {
      renderExecutionResult(results[results.length - 1].lastRes);
    }
    setInspectorTab('tests');
  }

  // ---------------------------------------------------------------------------
  // 6. Free Sandbox Mode & Templates
  // ---------------------------------------------------------------------------
  function renderSandboxTemplates() {
    el.sandboxTemplateList.innerHTML = '';
    for (const tpl of sandboxTemplates) {
      const card = document.createElement('div');
      card.className =
        'template-card' + (tpl.id === state.currentTemplateId ? ' active' : '');
      card.innerHTML = `
        <h4>${escapeHtml(tpl.name)}</h4>
        <p>${escapeHtml(tpl.description)}</p>
      `;
      card.addEventListener('click', () => {
        state.currentTemplateId = tpl.id;
        renderSandboxTemplates();
        loadFilesIntoEditor(tpl.files, 'Free Sandbox');
        renderPresetChips(tpl.presets || []);
        if (tpl.presets?.[0]) applyPresetToRequestBar(tpl.presets[0], false);
      });
      el.sandboxTemplateList.appendChild(card);
    }
  }

  function renderSandboxFileList() {
    el.sandboxFileList.innerHTML = '';
    state.files.forEach((f, idx) => {
      const item = document.createElement('div');
      item.className = 'sidebar-file-item' + (idx === state.activeFileIndex ? ' active' : '');
      item.innerHTML = `<span>📄 ${escapeHtml(f.name)}</span>`;
      item.addEventListener('click', () => {
        saveCurrentEditorToState();
        state.activeFileIndex = idx;
        renderFileTabs();
        renderSandboxFileList();
        syncEditorValueFromState();
      });
      el.sandboxFileList.appendChild(item);
    });
  }

  el.addFileBtn.addEventListener('click', () => {
    const fileName = prompt('Enter new TypeScript file name (e.g. custom.guard.ts):', 'custom.guard.ts');
    if (!fileName) return;
    const cleanName = fileName.endsWith('.ts') ? fileName : `${fileName}.ts`;
    saveCurrentEditorToState();
    state.files.push({
      name: cleanName,
      code: `import { Injectable } from '@nestjs/common';\n\n@Injectable()\nexport class CustomProvider {}\n`,
    });
    state.activeFileIndex = state.files.length - 1;
    renderFileTabs();
    renderSandboxFileList();
    syncEditorValueFromState();
  });

  // ---------------------------------------------------------------------------
  // 7. Top-Level Mode Switching (Trainer | Syntax Rosetta | Free Sandbox | Cheat Sheet)
  // ---------------------------------------------------------------------------
  const decompilerItems = window.NEST_DECORATOR_DECOMPILER || [];
  const syntaxChapters = window.NEST_SYNTAX_CHAPTERS || [];
  let activeDecompilerId = decompilerItems[0]?.id || '';

  function renderDecoratorDecompiler() {
    if (!el.decompilerPills || !el.decompilerBody) return;
    el.decompilerPills.innerHTML = '';

    for (const item of decompilerItems) {
      const btn = document.createElement('button');
      btn.className = 'decompiler-pill' + (item.id === activeDecompilerId ? ' active' : '');
      btn.textContent = item.token;
      btn.addEventListener('click', () => {
        activeDecompilerId = item.id;
        renderDecoratorDecompiler();
      });
      el.decompilerPills.appendChild(btn);
    }

    const active = decompilerItems.find((d) => d.id === activeDecompilerId) || decompilerItems[0];
    if (!active) return;

    el.decompilerBody.innerHTML = `
      <div style="margin-bottom:8px; display:flex; align-items:center; gap:8px;">
        <span class="badge badge-outline">${escapeHtml(active.kind)}</span>
        <span style="font-size:12.5px; color:var(--text-secondary);">${escapeHtml(active.summary)}</span>
      </div>
      <div class="syntax-split-grid">
        <div class="syntax-code-pane">
          <div class="syntax-code-header nest-hdr">
            <span>NestJS / TypeScript Decorator Syntax</span>
            <span>.ts</span>
          </div>
          <pre class="syntax-code-pre">${escapeHtml(active.nestjsCode)}</pre>
        </div>
        <div class="syntax-code-pane">
          <div class="syntax-code-header vanilla-hdr">
            <span>What Vanilla JavaScript Actually Executes Under the Hood</span>
            <span>.js</span>
          </div>
          <pre class="syntax-code-pre">${escapeHtml(active.vanillaJsCode)}</pre>
        </div>
      </div>
      <div class="decompiler-takeaway">
        <strong>💡 Key Mental Model:</strong> ${escapeHtml(active.takeaway)}
      </div>
    `;
  }

  function renderSyntaxRosettaStone(filterText = '') {
    if (!el.syntaxNavTree || !el.syntaxCardsContainer) return;
    const q = filterText.trim().toLowerCase();
    el.syntaxNavTree.innerHTML = '';
    el.syntaxCardsContainer.innerHTML = '';

    for (const chapter of syntaxChapters) {
      const matchingItems = (chapter.items || []).filter((item) => {
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
      });

      if (matchingItems.length === 0) continue;

      // 1. Sidebar Nav Group
      const navGroup = document.createElement('div');
      navGroup.className = 'mod-group';
      const navHeader = document.createElement('button');
      navHeader.className = 'mod-header';
      navHeader.innerHTML = `
        <span class="mod-num">${escapeHtml(chapter.number)}</span>
        <span style="flex:1">${escapeHtml(chapter.title)}</span>
      `;
      const navSublist = document.createElement('div');
      navSublist.className = 'mod-sublist';

      for (const item of matchingItems) {
        const navBtn = document.createElement('button');
        navBtn.className = 'subconcept-item';
        navBtn.innerHTML = `<span>${escapeHtml(item.title)}</span>`;
        navBtn.addEventListener('click', () => {
          const targetEl = document.getElementById(`syntax-card-${item.id}`);
          if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        navSublist.appendChild(navBtn);
      }

      navHeader.addEventListener('click', () => navSublist.classList.toggle('hidden'));
      navGroup.appendChild(navHeader);
      navGroup.appendChild(navSublist);
      el.syntaxNavTree.appendChild(navGroup);

      // 2. Main Chapter Block
      const chapterBlock = document.createElement('div');
      chapterBlock.className = 'syntax-chapter-block';
      chapterBlock.innerHTML = `
        <div class="syntax-chapter-header">
          <span class="badge badge-accent">Chapter ${escapeHtml(chapter.number)}</span>
          <h3>${escapeHtml(chapter.title)}</h3>
          <span class="muted-text">${escapeHtml(chapter.subtitle || '')}</span>
        </div>
      `;

      for (const item of matchingItems) {
        const card = document.createElement('div');
        card.className = 'syntax-card';
        card.id = `syntax-card-${item.id}`;

        const badgesHtml = (item.badges || [])
          .map((b) => `<span class="badge badge-outline" style="font-family:var(--font-mono);">${escapeHtml(b)}</span>`)
          .join('');

        const tokenRowsHtml = (item.tokenMap || [])
          .map(
            (row) => `
            <tr>
              <td><code class="nest-tok">${escapeHtml(row.nest)}</code></td>
              <td><code class="js-tok">${escapeHtml(row.vanilla)}</code></td>
              <td>${escapeHtml(row.meaning)}</td>
            </tr>
          `,
          )
          .join('');

        card.innerHTML = `
          <div class="syntax-card-top">
            <div>
              <h4>${escapeHtml(item.title)}</h4>
              <div class="syntax-badges">${badgesHtml}</div>
            </div>
            ${
              item.sandboxConceptId
                ? `<button class="btn btn-primary btn-xs try-syntax-btn" data-concept="${escapeHtml(item.sandboxConceptId)}">
                     ▶ Open &amp; Run in Live IDE
                   </button>`
                : ''
            }
          </div>

          <p class="syntax-mental-model">${escapeHtml(item.mentalModel)}</p>

          <div class="syntax-split-grid">
            <div class="syntax-code-pane">
              <div class="syntax-code-header nest-hdr">
                <span>NestJS Syntax (Kampus PropTech)</span>
                <span>TypeScript</span>
              </div>
              <pre class="syntax-code-pre">${escapeHtml(item.nestjsCode)}</pre>
            </div>
            <div class="syntax-code-pane">
              <div class="syntax-code-header vanilla-hdr">
                <span>Familiar Vanilla JavaScript / Express Equivalent</span>
                <span>Vanilla JS</span>
              </div>
              <pre class="syntax-code-pre">${escapeHtml(item.vanillaCode)}</pre>
            </div>
          </div>

          <table class="token-map-table">
            <thead>
              <tr>
                <th style="width:28%">NestJS / TS Syntax</th>
                <th style="width:32%">Vanilla JS / Express Equivalent</th>
                <th>How It Works &amp; Why NestJS Uses It</th>
              </tr>
            </thead>
            <tbody>
              ${tokenRowsHtml}
            </tbody>
          </table>
        `;

        const tryBtn = card.querySelector('.try-syntax-btn');
        if (tryBtn) {
          tryBtn.addEventListener('click', () => {
            const targetConceptId = tryBtn.getAttribute('data-concept');
            setAppMode('trainer');
            selectSubconcept(targetConceptId, 'learn');
            void runCurrentRequest();
          });
        }

        chapterBlock.appendChild(card);
      }

      el.syntaxCardsContainer.appendChild(chapterBlock);
    }
  }

  const prismaFullSchema = window.NEST_PRISMA_FULL_SCHEMA || '';
  const prismaSchemaExplorer = window.NEST_PRISMA_SCHEMA_EXPLORER || [];
  const prismaChapters = window.NEST_PRISMA_CHAPTERS || [];
  let activePrismaSchemaId = prismaSchemaExplorer[0]?.id || 'schema-id-strategy';

  if (el.fullPrismaSchemaPre) {
    el.fullPrismaSchemaPre.textContent = prismaFullSchema;
  }

  if (el.toggleFullPrismaSchemaBtn && el.fullPrismaSchemaBox) {
    el.toggleFullPrismaSchemaBtn.addEventListener('click', () => {
      const isHidden = el.fullPrismaSchemaBox.classList.toggle('hidden');
      el.toggleFullPrismaSchemaBtn.textContent = isHidden
        ? '📄 View Full Kampus schema.prisma'
        : '▾ Hide Full Kampus schema.prisma';
    });
  }

  if (el.prismaTryQueriesBtn) {
    el.prismaTryQueriesBtn.addEventListener('click', () => {
      setAppMode('trainer');
      selectSubconcept('prisma-queries-relations', 'learn');
      void runCurrentRequest();
    });
  }

  if (el.prismaTryTxBtn) {
    el.prismaTryTxBtn.addEventListener('click', () => {
      setAppMode('trainer');
      selectSubconcept('prisma-transactions-atomic', 'learn');
      void runCurrentRequest();
    });
  }

  function renderPrismaSchemaDecompiler() {
    if (!el.prismaSchemaPills || !el.prismaSchemaBody) return;
    el.prismaSchemaPills.innerHTML = '';

    for (const sc of prismaSchemaExplorer) {
      const btn = document.createElement('button');
      btn.className = 'decompiler-pill' + (sc.id === activePrismaSchemaId ? ' active' : '');
      btn.textContent = sc.badge;
      btn.addEventListener('click', () => {
        activePrismaSchemaId = sc.id;
        renderPrismaSchemaDecompiler();
      });
      el.prismaSchemaPills.appendChild(btn);
    }

    const active =
      prismaSchemaExplorer.find((s) => s.id === activePrismaSchemaId) || prismaSchemaExplorer[0];
    if (!active) return;

    el.prismaSchemaBody.innerHTML = `
      <div style="margin-bottom:10px;">
        <h4 style="font-size:14px; color:var(--text-primary);">${escapeHtml(active.title)}</h4>
      </div>
      <div class="syntax-split-grid">
        <div class="syntax-code-pane">
          <div class="syntax-code-header nest-hdr">
            <span>Prisma Schema Declaration (schema.prisma)</span>
            <span>Prisma</span>
          </div>
          <pre class="syntax-code-pre">${escapeHtml(active.prismaSnippet)}</pre>
        </div>
        <div class="syntax-code-pane">
          <div class="syntax-code-header vanilla-hdr">
            <span>Generated PostgreSQL Migration DDL (SQL)</span>
            <span>PostgreSQL</span>
          </div>
          <pre class="syntax-code-pre">${escapeHtml(active.sqlEquivalent)}</pre>
        </div>
      </div>
      <div class="rationale-drawer" style="margin-top:12px;">
        <div class="rationale-decision-card">
          <div class="rationale-q">
            <span class="rationale-num">Schema Decision</span>
            <h5>🤔 Why Is It Designed This Way in schema.prisma?</h5>
          </div>
          <p style="font-size:12.5px; line-height:1.6; color:var(--text-secondary); margin-bottom:8px;">
            ${escapeHtml(active.whyDecision)}
          </p>
          <div class="rationale-rule">
            <strong>🏆 Best-Practice Rule:</strong> ${escapeHtml(active.bestPractice)}
          </div>
        </div>
      </div>
    `;
  }

  function renderPrismaMastery(filterText = '') {
    if (!el.prismaNavTree || !el.prismaCardsContainer) return;
    const q = filterText.trim().toLowerCase();
    el.prismaNavTree.innerHTML = '';
    el.prismaCardsContainer.innerHTML = '';

    for (const ch of prismaChapters) {
      if (q) {
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
        if (!haystack.includes(q)) continue;
      }

      // Sidebar Nav Item
      const navGroup = document.createElement('div');
      navGroup.className = 'mod-group';
      const navHeader = document.createElement('button');
      navHeader.className = 'mod-header';
      navHeader.innerHTML = `
        <span class="mod-num">${escapeHtml(ch.number)}</span>
        <span style="flex:1">${escapeHtml(ch.title)}</span>
      `;
      navHeader.addEventListener('click', () => {
        const targetEl = document.getElementById(`prisma-chapter-${ch.id}`);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      navGroup.appendChild(navHeader);
      el.prismaNavTree.appendChild(navGroup);

      // Chapter Card
      const card = document.createElement('div');
      card.className = 'syntax-card';
      card.id = `prisma-chapter-${ch.id}`;

      const tokenRowsHtml = (ch.syntaxMap || [])
        .map(
          (row) => `
          <tr>
            <td><code class="nest-tok">${escapeHtml(row.prismaToken)}</code></td>
            <td><code class="js-tok">${escapeHtml(row.sqlOrJsEquivalent)}</code></td>
            <td>${escapeHtml(row.purpose)}</td>
          </tr>
        `,
        )
        .join('');

      const decisionsHtml =
        window.renderArchitecturalRationaleHtml && Array.isArray(ch.decisions)
          ? window.renderArchitecturalRationaleHtml(ch.decisions)
          : '';

      card.innerHTML = `
        <div class="syntax-card-top">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge badge-accent">Chapter ${escapeHtml(ch.number)}</span>
              <span class="badge badge-outline">${escapeHtml(ch.category)}</span>
            </div>
            <h4>${escapeHtml(ch.title)}</h4>
            <p class="muted-text" style="font-size:12.5px; margin-top:2px;">${escapeHtml(ch.subtitle)}</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="rationale-toggle-btn open prisma-rationale-toggle" style="width:auto; margin:0; padding:6px 12px;">
              <span>🔬 Hide Detailed Explanation (${(ch.decisions || []).length} Decisions)</span>
            </button>
            ${
              ch.sandboxConceptId
                ? `<button class="btn btn-primary btn-xs try-prisma-btn" data-concept="${escapeHtml(ch.sandboxConceptId)}">
                     ▶ Open &amp; Run in Live IDE
                   </button>`
                : ''
            }
          </div>
        </div>

        <div class="decompiler-takeaway" style="margin-bottom:12px;">
          <strong>💡 Core Takeaway:</strong> ${escapeHtml(ch.keyTakeaway)}
        </div>

        <div class="syntax-split-grid">
          <div class="syntax-code-pane">
            <div class="syntax-code-header nest-hdr">
              <span>Prisma Client in NestJS (Kampus PropTech)</span>
              <span>TypeScript</span>
            </div>
            <pre class="syntax-code-pre">${escapeHtml(ch.prismaCode)}</pre>
          </div>
          <div class="syntax-code-pane">
            <div class="syntax-code-header vanilla-hdr">
              <span>Generated PostgreSQL SQL / Anti-Pattern Comparison</span>
              <span>SQL / JS</span>
            </div>
            <pre class="syntax-code-pre">${escapeHtml(ch.rawSqlOrJsCode)}</pre>
          </div>
        </div>

        <table class="token-map-table" style="margin-top:12px;">
          <thead>
            <tr>
              <th style="width:28%">Prisma Client Syntax</th>
              <th style="width:30%">Generated SQL / Engine Behavior</th>
              <th>Exact Purpose &amp; Type-Safety Guarantee</th>
            </tr>
          </thead>
          <tbody>
            ${tokenRowsHtml}
          </tbody>
        </table>

        <div class="rationale-drawer prisma-rationale-drawer" style="margin-top:14px;">
          <div class="rationale-drawer-header">
            <h4>🏗️ Architectural Rationale — Why Prisma Is Used This Way in Production</h4>
            <p>Understanding the database concurrency, connection pooling, and indexing trade-offs behind every Prisma decision.</p>
          </div>
          ${decisionsHtml}
        </div>
      `;

      const toggleBtn = card.querySelector('.prisma-rationale-toggle');
      const drawerEl = card.querySelector('.prisma-rationale-drawer');
      if (toggleBtn && drawerEl) {
        toggleBtn.addEventListener('click', () => {
          const hidden = drawerEl.classList.toggle('hidden');
          toggleBtn.classList.toggle('open', !hidden);
          toggleBtn.innerHTML = `<span>🔬 ${hidden ? 'Show' : 'Hide'} Detailed Explanation (${(ch.decisions || []).length} Decisions)</span>`;
        });
      }

      const tryBtn = card.querySelector('.try-prisma-btn');
      if (tryBtn) {
        tryBtn.addEventListener('click', () => {
          const targetConceptId = tryBtn.getAttribute('data-concept');
          setAppMode('trainer');
          selectSubconcept(targetConceptId, 'learn');
          void runCurrentRequest();
        });
      }

      el.prismaCardsContainer.appendChild(card);
    }
  }

  if (el.prismaSearch) {
    el.prismaSearch.addEventListener('input', () => {
      renderPrismaMastery(el.prismaSearch.value);
    });
  }

  const mongooseFullSchema = window.NEST_MONGOOSE_FULL_SCHEMA || '';
  const mongooseSchemaExplorer = window.NEST_MONGOOSE_SCHEMA_EXPLORER || [];
  const mongooseChapters = window.NEST_MONGOOSE_CHAPTERS || [];
  let activeMongooseSchemaId = mongooseSchemaExplorer[0]?.id || 'mongo-embed-vs-ref';

  if (el.fullMongooseSchemaPre) {
    el.fullMongooseSchemaPre.textContent = mongooseFullSchema;
  }

  if (el.toggleFullMongooseSchemaBtn && el.fullMongooseSchemaBox) {
    el.toggleFullMongooseSchemaBtn.addEventListener('click', () => {
      const isHidden = el.fullMongooseSchemaBox.classList.toggle('hidden');
      el.toggleFullMongooseSchemaBtn.textContent = isHidden
        ? '📄 View Full Kampus Mongoose Schemas'
        : '▾ Hide Full Kampus Mongoose Schemas';
    });
  }

  if (el.mongooseTryQueriesBtn) {
    el.mongooseTryQueriesBtn.addEventListener('click', () => {
      setAppMode('trainer');
      selectSubconcept('mongoose-schemas-queries-lean', 'learn');
      void runCurrentRequest();
    });
  }

  if (el.mongooseTryAtomicBtn) {
    el.mongooseTryAtomicBtn.addEventListener('click', () => {
      setAppMode('trainer');
      selectSubconcept('mongoose-atomic-operators-upsert', 'learn');
      void runCurrentRequest();
    });
  }

  function renderMongooseSchemaDecompiler() {
    if (!el.mongooseSchemaPills || !el.mongooseSchemaBody) return;
    el.mongooseSchemaPills.innerHTML = '';

    for (const sc of mongooseSchemaExplorer) {
      const btn = document.createElement('button');
      btn.className = 'decompiler-pill' + (sc.id === activeMongooseSchemaId ? ' active' : '');
      btn.textContent = sc.badge;
      btn.addEventListener('click', () => {
        activeMongooseSchemaId = sc.id;
        renderMongooseSchemaDecompiler();
      });
      el.mongooseSchemaPills.appendChild(btn);
    }

    const active =
      mongooseSchemaExplorer.find((s) => s.id === activeMongooseSchemaId) ||
      mongooseSchemaExplorer[0];
    if (!active) return;

    el.mongooseSchemaBody.innerHTML = `
      <div style="margin-bottom:10px;">
        <h4 style="font-size:14px; color:var(--text-primary);">${escapeHtml(active.title)}</h4>
      </div>
      <div class="syntax-split-grid">
        <div class="syntax-code-pane">
          <div class="syntax-code-header nest-hdr">
            <span>@nestjs/mongoose Schema Declaration (.ts)</span>
            <span>TypeScript</span>
          </div>
          <pre class="syntax-code-pre">${escapeHtml(active.prismaSnippet)}</pre>
        </div>
        <div class="syntax-code-pane">
          <div class="syntax-code-header vanilla-hdr">
            <span>MongoDB BSON Storage &amp; Index Behavior</span>
            <span>MongoDB</span>
          </div>
          <pre class="syntax-code-pre">${escapeHtml(active.sqlEquivalent)}</pre>
        </div>
      </div>
      <div class="rationale-drawer" style="margin-top:12px;">
        <div class="rationale-decision-card">
          <div class="rationale-q">
            <span class="rationale-num">Schema Decision</span>
            <h5>🤔 Why Is It Modeled This Way in Mongoose &amp; MongoDB?</h5>
          </div>
          <p style="font-size:12.5px; line-height:1.6; color:var(--text-secondary); margin-bottom:8px;">
            ${escapeHtml(active.whyDecision)}
          </p>
          <div class="rationale-rule">
            <strong>🏆 Best-Practice Rule:</strong> ${escapeHtml(active.bestPractice)}
          </div>
        </div>
      </div>
    `;
  }

  function renderMongooseMastery(filterText = '') {
    if (!el.mongooseNavTree || !el.mongooseCardsContainer) return;
    const q = filterText.trim().toLowerCase();
    el.mongooseNavTree.innerHTML = '';
    el.mongooseCardsContainer.innerHTML = '';

    for (const ch of mongooseChapters) {
      if (q) {
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
        if (!haystack.includes(q)) continue;
      }

      const navGroup = document.createElement('div');
      navGroup.className = 'mod-group';
      const navHeader = document.createElement('button');
      navHeader.className = 'mod-header';
      navHeader.innerHTML = `
        <span class="mod-num">${escapeHtml(ch.number)}</span>
        <span style="flex:1">${escapeHtml(ch.title)}</span>
      `;
      navHeader.addEventListener('click', () => {
        const targetEl = document.getElementById(`mongoose-chapter-${ch.id}`);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      navGroup.appendChild(navHeader);
      el.mongooseNavTree.appendChild(navGroup);

      const card = document.createElement('div');
      card.className = 'syntax-card';
      card.id = `mongoose-chapter-${ch.id}`;

      const tokenRowsHtml = (ch.syntaxMap || [])
        .map(
          (row) => `
          <tr>
            <td><code class="nest-tok">${escapeHtml(row.prismaToken)}</code></td>
            <td><code class="js-tok">${escapeHtml(row.sqlOrJsEquivalent)}</code></td>
            <td>${escapeHtml(row.purpose)}</td>
          </tr>
        `,
        )
        .join('');

      const decisionsHtml =
        window.renderArchitecturalRationaleHtml && Array.isArray(ch.decisions)
          ? window.renderArchitecturalRationaleHtml(ch.decisions)
          : '';

      card.innerHTML = `
        <div class="syntax-card-top">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge badge-accent">Chapter ${escapeHtml(ch.number)}</span>
              <span class="badge badge-outline">${escapeHtml(ch.category)}</span>
            </div>
            <h4>${escapeHtml(ch.title)}</h4>
            <p class="muted-text" style="font-size:12.5px; margin-top:2px;">${escapeHtml(ch.subtitle)}</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="rationale-toggle-btn open mongoose-rationale-toggle" style="width:auto; margin:0; padding:6px 12px;">
              <span>🔬 Hide Detailed Explanation (${(ch.decisions || []).length} Decisions)</span>
            </button>
            ${
              ch.sandboxConceptId
                ? `<button class="btn btn-primary btn-xs try-mongoose-btn" data-concept="${escapeHtml(ch.sandboxConceptId)}">
                     ▶ Open &amp; Run in Live IDE
                   </button>`
                : ''
            }
          </div>
        </div>

        <div class="decompiler-takeaway" style="margin-bottom:12px;">
          <strong>💡 Core Takeaway:</strong> ${escapeHtml(ch.keyTakeaway)}
        </div>

        <div class="syntax-split-grid">
          <div class="syntax-code-pane">
            <div class="syntax-code-header nest-hdr">
              <span>@nestjs/mongoose in NestJS (Kampus PropTech)</span>
              <span>TypeScript</span>
            </div>
            <pre class="syntax-code-pre">${escapeHtml(ch.prismaCode)}</pre>
          </div>
          <div class="syntax-code-pane">
            <div class="syntax-code-header vanilla-hdr">
              <span>MongoDB Wire Behavior / Anti-Pattern Comparison</span>
              <span>MongoDB / JS</span>
            </div>
            <pre class="syntax-code-pre">${escapeHtml(ch.rawSqlOrJsCode)}</pre>
          </div>
        </div>

        <table class="token-map-table" style="margin-top:12px;">
          <thead>
            <tr>
              <th style="width:28%">Mongoose / @nestjs/mongoose Syntax</th>
              <th style="width:30%">MongoDB Driver / Engine Equivalent</th>
              <th>Exact Purpose &amp; Architectural Guarantee</th>
            </tr>
          </thead>
          <tbody>
            ${tokenRowsHtml}
          </tbody>
        </table>

        <div class="rationale-drawer mongoose-rationale-drawer" style="margin-top:14px;">
          <div class="rationale-drawer-header">
            <h4>🏗️ Architectural Rationale — Why Mongoose Is Used This Way in Production</h4>
            <p>Understanding the V8 hydration cost, WiredTiger single-document atomicity, and B-Tree indexing trade-offs behind every Mongoose decision.</p>
          </div>
          ${decisionsHtml}
        </div>
      `;

      const toggleBtn = card.querySelector('.mongoose-rationale-toggle');
      const drawerEl = card.querySelector('.mongoose-rationale-drawer');
      if (toggleBtn && drawerEl) {
        toggleBtn.addEventListener('click', () => {
          const hidden = drawerEl.classList.toggle('hidden');
          toggleBtn.classList.toggle('open', !hidden);
          toggleBtn.innerHTML = `<span>🔬 ${hidden ? 'Show' : 'Hide'} Detailed Explanation (${(ch.decisions || []).length} Decisions)</span>`;
        });
      }

      const tryBtn = card.querySelector('.try-mongoose-btn');
      if (tryBtn) {
        tryBtn.addEventListener('click', () => {
          const targetConceptId = tryBtn.getAttribute('data-concept');
          setAppMode('trainer');
          selectSubconcept(targetConceptId, 'learn');
          void runCurrentRequest();
        });
      }

      el.mongooseCardsContainer.appendChild(card);
    }
  }

  if (el.mongooseSearch) {
    el.mongooseSearch.addEventListener('input', () => {
      renderMongooseMastery(el.mongooseSearch.value);
    });
  }

  const testingFullSpec = window.NEST_TESTING_FULL_SPEC || '';
  const testingHarnessExplorer = window.NEST_TESTING_HARNESS_EXPLORER || [];
  const testingChapters = window.NEST_TESTING_CHAPTERS || [];
  let activeTestingHarnessId = testingHarnessExplorer[0]?.id || 'create-testing-module';

  if (el.fullTestingSpecPre) {
    el.fullTestingSpecPre.textContent = testingFullSpec;
  }

  if (el.toggleFullTestingSpecBtn && el.fullTestingSpecBox) {
    el.toggleFullTestingSpecBtn.addEventListener('click', () => {
      const isHidden = el.fullTestingSpecBox.classList.toggle('hidden');
      el.toggleFullTestingSpecBtn.textContent = isHidden
        ? '📄 View Full Kampus Unit + E2E .spec.ts Blueprint'
        : '▾ Hide Full Kampus .spec.ts Blueprint';
    });
  }

  if (el.testingTryUnitBtn) {
    el.testingTryUnitBtn.addEventListener('click', () => {
      setAppMode('trainer');
      selectSubconcept('testing-unit-testingmodule-mocks', 'learn');
      void runCurrentRequest();
    });
  }

  if (el.testingTryE2eBtn) {
    el.testingTryE2eBtn.addEventListener('click', () => {
      setAppMode('trainer');
      selectSubconcept('testing-integration-supertest-overrides', 'learn');
      void runCurrentRequest();
    });
  }

  function renderTestingHarnessDecompiler() {
    if (!el.testingHarnessPills || !el.testingHarnessBody) return;
    el.testingHarnessPills.innerHTML = '';

    for (const item of testingHarnessExplorer) {
      const btn = document.createElement('button');
      btn.className = 'decompiler-pill' + (item.id === activeTestingHarnessId ? ' active' : '');
      btn.textContent = item.category;
      btn.addEventListener('click', () => {
        activeTestingHarnessId = item.id;
        renderTestingHarnessDecompiler();
      });
      el.testingHarnessPills.appendChild(btn);
    }

    const active =
      testingHarnessExplorer.find((h) => h.id === activeTestingHarnessId) ||
      testingHarnessExplorer[0];
    if (!active) return;

    el.testingHarnessBody.innerHTML = `
      <div style="margin-bottom:10px;">
        <span class="badge badge-outline" style="margin-bottom:6px;">${escapeHtml(active.category)}</span>
        <h4 style="font-size:14px; color:var(--text-primary);"><code>${escapeHtml(active.token)}</code></h4>
      </div>
      <div class="rationale-grid">
        <div class="rationale-box technical-why">
          <strong>🎯 What This Construct Does</strong>
          <p>${escapeHtml(active.meaning)}</p>
        </div>
        <div class="rationale-box anti-pattern">
          <strong>⚙️ Under the Hood in NestJS &amp; Jest</strong>
          <p>${escapeHtml(active.underTheHood)}</p>
        </div>
      </div>
      <div class="rationale-rule" style="margin-top:10px;">
        <strong>🏆 Why It’s Best Practice:</strong> ${escapeHtml(active.whyBestPractice)}
      </div>
    `;
  }

  function renderTestingMastery(filterText = '') {
    if (!el.testingNavTree || !el.testingCardsContainer) return;
    const q = filterText.trim().toLowerCase();
    el.testingNavTree.innerHTML = '';
    el.testingCardsContainer.innerHTML = '';

    for (const ch of testingChapters) {
      if (q) {
        const haystack = [
          ch.title,
          ch.subtitle,
          ch.kampusScenario,
          ch.syntaxComparison?.leftCode || '',
          ch.syntaxComparison?.rightCode || '',
          ...(ch.syntaxMap || []).map((t) => `${t.syntax} ${t.purpose} ${t.pipelineCoverage}`),
          ...(ch.architecturalDecisions || []).map(
            (d) => `${d.question} ${d.antiPattern} ${d.technicalReason} ${d.bestPracticeRule}`,
          ),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) continue;
      }

      const navGroup = document.createElement('div');
      navGroup.className = 'mod-group';
      const navHeader = document.createElement('button');
      navHeader.className = 'mod-header';
      navHeader.innerHTML = `
        <span class="mod-num">${escapeHtml(ch.number)}</span>
        <span style="flex:1">${escapeHtml(ch.title)}</span>
      `;
      navHeader.addEventListener('click', () => {
        const targetEl = document.getElementById(`testing-chapter-${ch.id}`);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      navGroup.appendChild(navHeader);
      el.testingNavTree.appendChild(navGroup);

      const card = document.createElement('div');
      card.className = 'syntax-card';
      card.id = `testing-chapter-${ch.id}`;

      const tokenRowsHtml = (ch.syntaxMap || [])
        .map(
          (row) => `
          <tr>
            <td><code class="nest-tok">${escapeHtml(row.syntax)}</code></td>
            <td>${escapeHtml(row.purpose)}</td>
            <td>${escapeHtml(row.pipelineCoverage)}</td>
          </tr>
        `,
        )
        .join('');

      const decisionsHtml =
        window.renderArchitecturalRationaleHtml && Array.isArray(ch.architecturalDecisions)
          ? window.renderArchitecturalRationaleHtml(ch.architecturalDecisions)
          : '';

      card.innerHTML = `
        <div class="syntax-card-top">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge badge-accent">Chapter ${escapeHtml(ch.number)}</span>
            </div>
            <h4>${escapeHtml(ch.title)}</h4>
            <p class="muted-text" style="font-size:12.5px; margin-top:2px;">${escapeHtml(ch.subtitle)}</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button type="button" class="rationale-toggle-btn open testing-rationale-toggle" style="width:auto; margin:0; padding:6px 12px;">
              <span>🔬 Hide Detailed Explanation (${(ch.architecturalDecisions || []).length} Decisions)</span>
            </button>
            ${
              ch.relatedSubconceptId
                ? `<button class="btn btn-primary btn-xs try-testing-btn" data-concept="${escapeHtml(ch.relatedSubconceptId)}">
                     ▶ Practice in Live IDE
                   </button>`
                : ''
            }
          </div>
        </div>

        <div class="decompiler-takeaway" style="margin-bottom:12px;">
          <strong>🏠 Kampus Engineering Scenario:</strong> ${escapeHtml(ch.kampusScenario)}
        </div>

        <div class="syntax-split-grid">
          <div class="syntax-code-pane">
            <div class="syntax-code-header nest-hdr">
              <span>${escapeHtml(ch.syntaxComparison?.leftTitle || 'Unit Test')}</span>
              <span>TypeScript / Jest</span>
            </div>
            <pre class="syntax-code-pre">${escapeHtml(ch.syntaxComparison?.leftCode || '')}</pre>
          </div>
          <div class="syntax-code-pane">
            <div class="syntax-code-header vanilla-hdr">
              <span>${escapeHtml(ch.syntaxComparison?.rightTitle || 'Integration Test')}</span>
              <span>TypeScript / Supertest</span>
            </div>
            <pre class="syntax-code-pre">${escapeHtml(ch.syntaxComparison?.rightCode || '')}</pre>
          </div>
        </div>

        <table class="token-map-table" style="margin-top:12px;">
          <thead>
            <tr>
              <th style="width:32%">@nestjs/testing / Jest / Supertest Syntax</th>
              <th style="width:36%">Exact Purpose in Test Suite</th>
              <th>Pipeline Coverage &amp; Guarantee</th>
            </tr>
          </thead>
          <tbody>
            ${tokenRowsHtml}
          </tbody>
        </table>

        <div class="rationale-drawer testing-rationale-drawer" style="margin-top:14px;">
          <div class="rationale-drawer-header">
            <h4>🏗️ Architectural Rationale — Why We Test NestJS This Way in Production</h4>
            <p>Understanding why isolated IoC containers, spy assertions, and in-memory Supertest pipelines prevent production regressions.</p>
          </div>
          ${decisionsHtml}
        </div>
      `;

      const toggleBtn = card.querySelector('.testing-rationale-toggle');
      const drawerEl = card.querySelector('.testing-rationale-drawer');
      if (toggleBtn && drawerEl) {
        toggleBtn.addEventListener('click', () => {
          const hidden = drawerEl.classList.toggle('hidden');
          toggleBtn.classList.toggle('open', !hidden);
          toggleBtn.innerHTML = `<span>🔬 ${hidden ? 'Show' : 'Hide'} Detailed Explanation (${(ch.architecturalDecisions || []).length} Decisions)</span>`;
        });
      }

      const tryBtn = card.querySelector('.try-testing-btn');
      if (tryBtn) {
        tryBtn.addEventListener('click', () => {
          const targetConceptId = tryBtn.getAttribute('data-concept');
          setAppMode('trainer');
          selectSubconcept(targetConceptId, 'learn');
          void runCurrentRequest();
        });
      }

      el.testingCardsContainer.appendChild(card);
    }
  }

  if (el.testingSearch) {
    el.testingSearch.addEventListener('input', () => {
      renderTestingMastery(el.testingSearch.value);
    });
  }

  function setAppMode(mode) {
    saveCurrentEditorToState();
    state.mode = mode;

    el.modeBtns.forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });

    if (mode === 'cheatsheet') {
      el.workspaceMain.classList.add('hidden');
      if (el.syntaxView) el.syntaxView.classList.add('hidden');
      if (el.prismaView) el.prismaView.classList.add('hidden');
      if (el.mongooseView) el.mongooseView.classList.add('hidden');
      if (el.testingView) el.testingView.classList.add('hidden');
      el.cheatsheetView.classList.remove('hidden');
      return;
    }

    if (mode === 'syntax') {
      el.workspaceMain.classList.add('hidden');
      el.cheatsheetView.classList.add('hidden');
      if (el.prismaView) el.prismaView.classList.add('hidden');
      if (el.mongooseView) el.mongooseView.classList.add('hidden');
      if (el.testingView) el.testingView.classList.add('hidden');
      if (el.syntaxView) {
        el.syntaxView.classList.remove('hidden');
        renderDecoratorDecompiler();
        renderSyntaxRosettaStone(el.syntaxSearch?.value || '');
      }
      return;
    }

    if (mode === 'prisma') {
      el.workspaceMain.classList.add('hidden');
      el.cheatsheetView.classList.add('hidden');
      if (el.syntaxView) el.syntaxView.classList.add('hidden');
      if (el.mongooseView) el.mongooseView.classList.add('hidden');
      if (el.testingView) el.testingView.classList.add('hidden');
      if (el.prismaView) {
        el.prismaView.classList.remove('hidden');
        renderPrismaSchemaDecompiler();
        renderPrismaMastery(el.prismaSearch?.value || '');
      }
      return;
    }

    if (mode === 'mongoose') {
      el.workspaceMain.classList.add('hidden');
      el.cheatsheetView.classList.add('hidden');
      if (el.syntaxView) el.syntaxView.classList.add('hidden');
      if (el.prismaView) el.prismaView.classList.add('hidden');
      if (el.testingView) el.testingView.classList.add('hidden');
      if (el.mongooseView) {
        el.mongooseView.classList.remove('hidden');
        renderMongooseSchemaDecompiler();
        renderMongooseMastery(el.mongooseSearch?.value || '');
      }
      return;
    }

    if (mode === 'testing') {
      el.workspaceMain.classList.add('hidden');
      el.cheatsheetView.classList.add('hidden');
      if (el.syntaxView) el.syntaxView.classList.add('hidden');
      if (el.prismaView) el.prismaView.classList.add('hidden');
      if (el.mongooseView) el.mongooseView.classList.add('hidden');
      if (el.testingView) {
        el.testingView.classList.remove('hidden');
        renderTestingHarnessDecompiler();
        renderTestingMastery(el.testingSearch?.value || '');
      }
      return;
    }

    el.cheatsheetView.classList.add('hidden');
    if (el.syntaxView) el.syntaxView.classList.add('hidden');
    if (el.prismaView) el.prismaView.classList.add('hidden');
    if (el.mongooseView) el.mongooseView.classList.add('hidden');
    if (el.testingView) el.testingView.classList.add('hidden');
    el.workspaceMain.classList.remove('hidden');

    if (mode === 'sandbox') {
      el.workspaceMain.classList.add('sandbox-mode');
      el.trainerPane.classList.add('hidden');
      el.sidebarTrainerView.classList.add('hidden');
      el.sidebarSandboxView.classList.remove('hidden');
      renderSandboxTemplates();
      const tpl =
        sandboxTemplates.find((t) => t.id === state.currentTemplateId) || sandboxTemplates[0];
      if (tpl) {
        const saved = state.savedBuffers[`sandbox:${tpl.id}`];
        loadFilesIntoEditor(
          Array.isArray(saved) && saved.length > 0 ? saved : tpl.files,
          Array.isArray(saved) && saved.length > 0 ? 'Free Sandbox (Saved)' : 'Free Sandbox',
          false,
        );
        renderPresetChips(tpl.presets || []);
        if (tpl.presets?.[0]) applyPresetToRequestBar(tpl.presets[0], false);
      }
    } else {
      el.workspaceMain.classList.remove('sandbox-mode');
      el.trainerPane.classList.remove('hidden');
      el.sidebarTrainerView.classList.remove('hidden');
      el.sidebarSandboxView.classList.add('hidden');
      selectSubconcept(state.currentSubconceptId, state.trainerTab);
    }
    saveUiLocation();
  }

  if (el.syntaxSearch) {
    el.syntaxSearch.addEventListener('input', () => {
      renderSyntaxRosettaStone(el.syntaxSearch.value);
    });
  }

  // ---------------------------------------------------------------------------
  // 8. Event Listeners & Keyboard Shortcuts
  // ---------------------------------------------------------------------------
  el.modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => setAppMode(btn.getAttribute('data-mode')));
  });

  el.conceptSearch.addEventListener('input', () => {
    renderCurriculumTree(el.conceptSearch.value);
  });

  el.tabLearnBtn.addEventListener('click', () => setTrainerTab('learn', true));
  el.tabExerciseBtn.addEventListener('click', () => setTrainerTab('exercise', true));
  el.startExerciseCta.addEventListener('click', () => setTrainerTab('exercise', true));

  el.loadExampleBtn.addEventListener('click', () => {
    const sub = getActiveSubconcept();
    if (sub) {
      delete state.savedBuffers[`trainer:${sub.id}:learn`];
      loadFilesIntoEditor(sub.exampleFiles || [], 'Example Code', true);
    }
  });

  el.loadStarterBtn.addEventListener('click', () => {
    const sub = getActiveSubconcept();
    if (sub?.exercise) {
      delete state.savedBuffers[`trainer:${sub.id}:exercise`];
      loadFilesIntoEditor(sub.exercise.starterFiles || [], 'Exercise Starter', true);
    }
  });

  el.loadSolutionBtn.addEventListener('click', () => {
    const sub = getActiveSubconcept();
    if (sub?.exercise) loadFilesIntoEditor(sub.exercise.solutionFiles || [], 'Reference Solution', true);
  });

  if (el.toggleSidebarBtn) {
    el.toggleSidebarBtn.addEventListener('click', () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      el.workspaceMain.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
      el.toggleSidebarBtn.textContent = state.sidebarCollapsed ? '▶ Sidebar' : '◀ Sidebar';
      saveUiLocation();
    });
  }

  if (el.toggleTrainerBtn) {
    el.toggleTrainerBtn.addEventListener('click', () => {
      state.trainerCollapsed = !state.trainerCollapsed;
      el.workspaceMain.classList.toggle('trainer-collapsed', state.trainerCollapsed);
      el.toggleTrainerBtn.textContent = state.trainerCollapsed ? '▶ Lesson' : '◀ Lesson';
      saveUiLocation();
    });
  }

  function applyLayoutDimensions() {
    if (!el.workspaceMain) return;
    el.workspaceMain.style.setProperty('--sidebar-width', `${state.sidebarWidth}px`);
    el.workspaceMain.style.setProperty('--trainer-width', `${state.trainerWidth}px`);
    el.workspaceMain.style.setProperty('--editor-height', `${state.editorHeightPct}%`);
    el.workspaceMain.style.setProperty('--payload-height', `${state.payloadHeight}px`);
    if (state.monacoEditor) {
      state.monacoEditor.layout();
    }
  }

  if (el.expandInspectorBtn) {
    el.expandInspectorBtn.addEventListener('click', () => {
      state.editorHeightPct = 24;
      state.payloadHeight = 52;
      applyLayoutDimensions();
      saveUiLocation();
    });
  }

  if (el.balanceSplitBtn) {
    el.balanceSplitBtn.addEventListener('click', () => {
      state.editorHeightPct = 50;
      state.payloadHeight = 68;
      applyLayoutDimensions();
      saveUiLocation();
    });
  }

  if (el.expandEditorBtn) {
    el.expandEditorBtn.addEventListener('click', () => {
      state.editorHeightPct = 72;
      applyLayoutDimensions();
      saveUiLocation();
    });
  }

  function initResizablePanes() {
    // 1. Sidebar Horizontal Resizer
    if (el.resizerSidebar) {
      el.resizerSidebar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        el.resizerSidebar.classList.add('dragging');
        document.body.classList.add('is-resizing-col');
        const startX = e.clientX;
        const startWidth = state.sidebarWidth;

        const onMove = (ev) => {
          const next = Math.min(520, Math.max(180, startWidth + (ev.clientX - startX)));
          state.sidebarWidth = next;
          applyLayoutDimensions();
        };
        const onUp = () => {
          el.resizerSidebar.classList.remove('dragging');
          document.body.classList.remove('is-resizing-col');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveUiLocation();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      el.resizerSidebar.addEventListener('dblclick', () => {
        state.sidebarWidth = 270;
        applyLayoutDimensions();
        saveUiLocation();
      });
    }

    // 2. Trainer Pane Horizontal Resizer
    if (el.resizerTrainer) {
      el.resizerTrainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        el.resizerTrainer.classList.add('dragging');
        document.body.classList.add('is-resizing-col');
        const startX = e.clientX;
        const startWidth = state.trainerWidth;

        const onMove = (ev) => {
          const next = Math.min(760, Math.max(260, startWidth + (ev.clientX - startX)));
          state.trainerWidth = next;
          applyLayoutDimensions();
        };
        const onUp = () => {
          el.resizerTrainer.classList.remove('dragging');
          document.body.classList.remove('is-resizing-col');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveUiLocation();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      el.resizerTrainer.addEventListener('dblclick', () => {
        state.trainerWidth = 410;
        applyLayoutDimensions();
        saveUiLocation();
      });
    }

    // 3. Workbench Vertical Resizer (Code Editor <-> HTTP Simulator)
    if (el.resizerWorkbench && el.workbench) {
      el.resizerWorkbench.addEventListener('mousedown', (e) => {
        e.preventDefault();
        el.resizerWorkbench.classList.add('dragging');
        document.body.classList.add('is-resizing-row');
        const rect = el.workbench.getBoundingClientRect();

        const onMove = (ev) => {
          const relY = ev.clientY - rect.top;
          const pct = Math.min(82, Math.max(16, Math.round((relY / rect.height) * 100)));
          state.editorHeightPct = pct;
          applyLayoutDimensions();
        };
        const onUp = () => {
          el.resizerWorkbench.classList.remove('dragging');
          document.body.classList.remove('is-resizing-row');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveUiLocation();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      el.resizerWorkbench.addEventListener('dblclick', () => {
        state.editorHeightPct = 50;
        applyLayoutDimensions();
        saveUiLocation();
      });
    }

    // 4. Inspector Tabs Bar Resizer (Request Payload Drawer <-> Inspector Tabs Dock)
    if (el.resizerInspector && el.workbench) {
      el.resizerInspector.addEventListener('mousedown', (e) => {
        e.preventDefault();
        el.resizerInspector.classList.add('dragging');
        document.body.classList.add('is-resizing-row');
        const startY = e.clientY;
        const startPayloadH = state.payloadHeight;
        const startEditorPct = state.editorHeightPct;
        const wbRect = el.workbench.getBoundingClientRect();
        const isDrawerOpen = !el.reqPayloadDrawer.classList.contains('hidden');

        const onMove = (ev) => {
          const deltaY = ev.clientY - startY;
          if (isDrawerOpen) {
            const nextPayloadH = Math.min(260, Math.max(44, startPayloadH + deltaY));
            state.payloadHeight = nextPayloadH;
          } else {
            const deltaPct = (deltaY / wbRect.height) * 100;
            state.editorHeightPct = Math.min(82, Math.max(16, Math.round(startEditorPct + deltaPct)));
          }
          applyLayoutDimensions();
        };
        const onUp = () => {
          el.resizerInspector.classList.remove('dragging');
          document.body.classList.remove('is-resizing-row');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          saveUiLocation();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      el.resizerInspector.addEventListener('dblclick', () => {
        state.payloadHeight = 68;
        state.editorHeightPct = 50;
        applyLayoutDimensions();
        saveUiLocation();
      });
    }
  }

  el.toggleHintBtn.addEventListener('click', () => {
    el.exerciseHintsBox.classList.toggle('hidden');
  });

  if (el.toggleRationaleBtn && el.conceptRationaleDrawer) {
    el.toggleRationaleBtn.addEventListener('click', () => {
      const sub = getActiveSubconcept();
      const decisions =
        sub?.architecturalDecisions ||
        (window.NEST_ARCHITECTURAL_RATIONALE && window.NEST_ARCHITECTURAL_RATIONALE[sub?.id]) ||
        [];
      const isHidden = el.conceptRationaleDrawer.classList.toggle('hidden');
      el.toggleRationaleBtn.querySelector('span').textContent = isHidden
        ? `🔬 Show Detailed Explanation (${decisions.length} Architectural Decisions)`
        : `🔬 Hide Detailed Explanation (${decisions.length} Architectural Decisions)`;
      if (el.rationaleChevron) {
        el.rationaleChevron.textContent = isHidden ? '▾' : '▴';
      }
    });
  }

  el.runExerciseBtn.addEventListener('click', () => void runExerciseVerification());
  el.quickVerifyBtn.addEventListener('click', () => {
    if (state.mode !== 'trainer') setAppMode('trainer');
    if (state.trainerTab !== 'exercise') setTrainerTab('exercise', false);
    void runExerciseVerification();
  });

  el.sendReqBtn.addEventListener('click', () => void runCurrentRequest());
  el.quickRunBtn.addEventListener('click', () => void runCurrentRequest());
  el.burstReqBtn.addEventListener('click', () => void runBurstRequests(5));

  el.resetStateBtn.addEventListener('click', () => {
    window.NestSandboxEngine.resetState();
    renderSandboxStatePanel();
    el.respStatusBadge.textContent = 'State Reset';
    el.respStatusBadge.className = 'status-pill status-idle';
  });

  el.prevConceptBtn.addEventListener('click', () => {
    const idx = allSubconcepts.findIndex((s) => s.id === state.currentSubconceptId);
    if (idx > 0) selectSubconcept(allSubconcepts[idx - 1].id, 'learn');
  });

  el.nextConceptBtn.addEventListener('click', () => {
    const idx = allSubconcepts.findIndex((s) => s.id === state.currentSubconceptId);
    if (idx < allSubconcepts.length - 1) selectSubconcept(allSubconcepts[idx + 1].id, 'learn');
  });

  el.inspectorTabs.forEach((btn) => {
    btn.addEventListener('click', () => setInspectorTab(btn.getAttribute('data-out')));
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      void runExerciseVerification();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void runCurrentRequest();
    }
  });

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Optional progressive enhancement: Load Monaco Editor if CDN is reachable
  function tryInitMonaco() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs/loader.min.js';
    script.onload = () => {
      if (!window.require) return;
      window.require.config({
        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.47.0/min/vs' },
      });
      window.require(['vs/editor/editor.main'], () => {
        const monaco = window.monaco;
        if (!monaco) return;
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2020,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          noSemanticValidation: true,
          noSyntaxValidation: false,
        });
        if (window.NEST_MONACO_EXTRA_LIBS) {
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            window.NEST_MONACO_EXTRA_LIBS,
            'file:///node_modules/@types/nestjs-kampus-ambient/index.d.ts',
          );
        }

        el.fallbackEditor.classList.add('hidden');
        state.monacoEditor = monaco.editor.create(el.monacoMount, {
          value: state.files[state.activeFileIndex]?.code || '',
          language: 'typescript',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          tabSize: 2,
          scrollBeyondLastLine: false,
        });

        state.monacoEditor.onDidChangeModelContent(() => {
          if (state.files[state.activeFileIndex]) {
            state.files[state.activeFileIndex].code = state.monacoEditor.getValue();
            persistCurrentBufferToStorage();
          }
        });
      });
    };
    document.head.appendChild(script);
  }

  // Restore location from URL hash or localStorage
  function restoreInitialUiState() {
    try {
      const savedUi = JSON.parse(localStorage.getItem(STORAGE_KEY_UI) || '{}') || {};
      if (savedUi.sub && allSubconcepts.some((s) => s.id === savedUi.sub)) {
        state.currentSubconceptId = savedUi.sub;
      }
      if (savedUi.tab === 'learn' || savedUi.tab === 'exercise') {
        state.trainerTab = savedUi.tab;
      }
      if (savedUi.mode && ['trainer', 'syntax', 'sandbox', 'cheatsheet'].includes(savedUi.mode)) {
        state.mode = savedUi.mode;
      }
      if (savedUi.sidebarCollapsed) {
        state.sidebarCollapsed = true;
        el.workspaceMain.classList.add('sidebar-collapsed');
        if (el.toggleSidebarBtn) el.toggleSidebarBtn.textContent = '▶ Sidebar';
      }
      if (savedUi.trainerCollapsed) {
        state.trainerCollapsed = true;
        el.workspaceMain.classList.add('trainer-collapsed');
        if (el.toggleTrainerBtn) el.toggleTrainerBtn.textContent = '▶ Lesson';
      }
      if (typeof savedUi.sidebarWidth === 'number') state.sidebarWidth = savedUi.sidebarWidth;
      if (typeof savedUi.trainerWidth === 'number') state.trainerWidth = savedUi.trainerWidth;
      if (typeof savedUi.editorHeightPct === 'number') state.editorHeightPct = savedUi.editorHeightPct;
      if (typeof savedUi.payloadHeight === 'number') state.payloadHeight = savedUi.payloadHeight;
    } catch {
      // ignore
    }

    const rawHash = (window.location.hash || '').replace(/^#/, '');
    if (rawHash) {
      const params = new URLSearchParams(rawHash);
      const hMode = params.get('mode');
      const hSub = params.get('sub');
      const hTab = params.get('tab');
      if (hSub && allSubconcepts.some((s) => s.id === hSub)) state.currentSubconceptId = hSub;
      if (hTab === 'learn' || hTab === 'exercise') state.trainerTab = hTab;
      if (hMode && ['trainer', 'syntax', 'sandbox', 'cheatsheet'].includes(hMode)) state.mode = hMode;
    }
  }

  // Bootstrap UI
  restoreInitialUiState();
  applyLayoutDimensions();
  initResizablePanes();
  updateProgressHeader();
  renderCurriculumTree();
  setAppMode(state.mode);
  updateJsonValidationBadges();
  void runCurrentRequest();
  tryInitMonaco();

  // ---------------------------------------------------------------------------
  // 9. Context-Aware Kampus AI Tutor & Code Diagnostic Bot Integration
  // ---------------------------------------------------------------------------
  const tutorFabBtn = document.getElementById('tutor-fab-btn');
  const tutorFabBadge = document.getElementById('tutor-fab-badge');
  const tutorDrawer = document.getElementById('tutor-drawer');
  const tutorCloseBtn = document.getElementById('tutor-close-btn');
  const tutorClearBtn = document.getElementById('tutor-clear-btn');
  const tutorApiKeyToggleBtn = document.getElementById('tutor-apikey-toggle-btn');
  const tutorApiKeyBar = document.getElementById('tutor-apikey-bar');
  const tutorApiKeyInput = document.getElementById('tutor-apikey-input');
  const tutorContextBar = document.getElementById('tutor-context-bar');
  const tutorChipsEl = document.getElementById('tutor-chips');
  const tutorMessagesEl = document.getElementById('tutor-messages');
  const tutorForm = document.getElementById('tutor-form');
  const tutorInput = document.getElementById('tutor-input');

  function formatTutorMd(md) {
    if (!md) return '';
    const codeBlocks = [];
    const withPlaceholders = String(md).replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(`<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`);
      return `@@CODEBLOCK_${idx}@@`;
    });
    const formatInline = (txt) =>
      escapeHtml(txt)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    const lines = withPlaceholders.split('\n');
    const out = [];
    let inList = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        continue;
      }
      if (line.startsWith('@@CODEBLOCK_')) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        const m = line.match(/@@CODEBLOCK_(\d+)@@/);
        if (m) out.push(codeBlocks[Number(m[1])] || '');
        continue;
      }
      if (line.startsWith('### ') || line.startsWith('## ')) {
        if (inList) {
          out.push('</ul>');
          inList = false;
        }
        out.push(`<h3>${formatInline(line.replace(/^#{2,3}\s+/, ''))}</h3>`);
        continue;
      }
      if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s+/.test(line)) {
        if (!inList) {
          out.push('<ul>');
          inList = true;
        }
        out.push(`<li>${formatInline(line.replace(/^(-|\*|\d+\.)\s+/, ''))}</li>`);
        continue;
      }
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<p>${formatInline(line)}</p>`);
    }
    if (inList) out.push('</ul>');
    return out.join('\n');
  }

  function getTutorContext() {
    saveCurrentEditorToState();
    const sub = getActiveSubconcept();
    return {
      mode: state.mode,
      trainerTab: state.trainerTab,
      subconcept: sub || null,
      currentFiles: state.files || [],
      activeFileIndex: state.activeFileIndex || 0,
      lastExecutionResult: state.lastExecutionResult || null,
      testResults: state.lastTestResults || null,
    };
  }

  function refreshTutorContextUi() {
    const ctx = getTutorContext();
    const badge =
      ctx.mode === 'prisma'
        ? '💎 Prisma ORM'
        : ctx.mode === 'mongoose'
          ? '🍃 Mongoose ODM'
          : ctx.mode === 'syntax'
            ? '🧬 Syntax Rosetta'
            : ctx.mode === 'sandbox'
              ? '🧪 Free Sandbox'
              : ctx.mode === 'cheatsheet'
                ? '🗺️ Cheat Sheet'
                : ctx.subconcept
                  ? `${ctx.subconcept.code} · ${ctx.subconcept.title.split(' ')[0]}`
                  : 'Kampus Lesson';
    if (tutorFabBadge) tutorFabBadge.textContent = badge;

    if (tutorContextBar) {
      const activeFile = ctx.currentFiles[ctx.activeFileIndex] || ctx.currentFiles[0];
      tutorContextBar.innerHTML = `
        <span class="tutor-ctx-pill active">📍 ${escapeHtml(
          ctx.mode === 'trainer' && ctx.subconcept
            ? `${ctx.subconcept.code} ${ctx.subconcept.title}`
            : badge,
        )}</span>
        ${
          ctx.mode === 'trainer'
            ? `<span class="tutor-ctx-pill">${
                ctx.trainerTab === 'exercise' ? '🏋️ Exercise Mode' : '📖 Concept Mode'
              }</span>`
            : ''
        }
        ${activeFile ? `<span class="tutor-ctx-pill">📄 ${escapeHtml(activeFile.name)}</span>` : ''}
      `;
    }

    if (tutorChipsEl && window.KampusAiTutor) {
      const chips = window.KampusAiTutor.getSuggestedQuestions(ctx);
      tutorChipsEl.innerHTML = '';
      for (const chipText of chips) {
        const chipBtn = document.createElement('button');
        chipBtn.type = 'button';
        chipBtn.className = 'tutor-chip';
        chipBtn.textContent = chipText;
        chipBtn.addEventListener('click', () => void submitTutorQuestion(chipText));
        tutorChipsEl.appendChild(chipBtn);
      }
    }
  }

  function appendTutorMessage(role, content, sourceLabel = '🤖 Kampus Tutor') {
    if (!tutorMessagesEl) return;
    const msgEl = document.createElement('div');
    msgEl.className = `tutor-msg ${role}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msgEl.innerHTML = `
      <div class="tutor-msg-meta">
        <span>${escapeHtml(role === 'assistant' ? sourceLabel : '👤 You')}</span>
        <span>${escapeHtml(timeStr)}</span>
      </div>
      <div class="tutor-msg-body">
        ${role === 'assistant' ? formatTutorMd(content) : `<p>${escapeHtml(content)}</p>`}
      </div>
    `;
    tutorMessagesEl.appendChild(msgEl);
    tutorMessagesEl.scrollTop = tutorMessagesEl.scrollHeight;
  }

  async function submitTutorQuestion(questionText) {
    const q = String(questionText || '').trim();
    if (!q || !window.KampusAiTutor) return;
    appendTutorMessage('user', q);
    if (tutorInput) tutorInput.value = '';
    const ctx = getTutorContext();
    const apiKey = tutorApiKeyInput ? tutorApiKeyInput.value.trim() : '';
    const res = await window.KampusAiTutor.askTutor(q, ctx, apiKey);
    appendTutorMessage(
      'assistant',
      res.answer,
      res.source === 'gemini-api' ? '✨ Kampus Tutor (Gemini 2.5 Flash)' : '🤖 Kampus Tutor (Context Engine)',
    );
  }

  if (tutorMessagesEl) {
    appendTutorMessage(
      'assistant',
      '### 👋 Hi! I am your Context-Aware Kampus Backend Tutor.\n\n' +
        'I can see the **exact lesson** you are studying, your **live TypeScript code in the editor**, your **last HTTP response**, and any **failing exercise test assertions**.\n\n' +
        '- Click **"🏗️ Why is this lesson built this way?"** to understand the architectural trade-offs.\n' +
        '- Click **"🔍 Debug my current code & tests"** if your exercise or endpoint isn\'t passing.\n' +
        '- Or type any specific question about **NestJS**, **Prisma**, **Mongoose**, or **TypeScript** below!',
    );
  }

  if (tutorFabBtn && tutorDrawer) {
    tutorFabBtn.addEventListener('click', () => {
      const hidden = tutorDrawer.classList.toggle('hidden');
      if (!hidden) refreshTutorContextUi();
    });
  }
  if (tutorCloseBtn && tutorDrawer) {
    tutorCloseBtn.addEventListener('click', () => tutorDrawer.classList.add('hidden'));
  }
  if (tutorClearBtn && tutorMessagesEl) {
    tutorClearBtn.addEventListener('click', () => {
      const first = tutorMessagesEl.firstElementChild;
      tutorMessagesEl.innerHTML = '';
      if (first) tutorMessagesEl.appendChild(first);
    });
  }
  if (tutorApiKeyToggleBtn && tutorApiKeyBar) {
    tutorApiKeyToggleBtn.addEventListener('click', () => tutorApiKeyBar.classList.toggle('hidden'));
  }
  if (tutorApiKeyInput) {
    tutorApiKeyInput.value = localStorage.getItem('kampus_gemini_api_key') || '';
    tutorApiKeyInput.addEventListener('input', () => {
      const v = tutorApiKeyInput.value.trim();
      if (v) localStorage.setItem('kampus_gemini_api_key', v);
      else localStorage.removeItem('kampus_gemini_api_key');
    });
  }
  if (tutorForm && tutorInput) {
    tutorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      void submitTutorQuestion(tutorInput.value);
    });
    tutorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submitTutorQuestion(tutorInput.value);
      }
    });
  }

  refreshTutorContextUi();
})();
