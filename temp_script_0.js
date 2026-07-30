
    const DEPT_DATA = [];
    const YEARS = [];
    const EVIDENCE_TYPES = [];
    const SECTIONS = [];

    /* ── SVG Icon library ── */
    const ICON = {
      check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
      upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
      download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
      fileText: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
      layers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
      shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      link: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    };

    let state = null;
    let activeYear = YEARS[0];
    let selectedSections = ['A'];
    let dirty = false;
    let autoSaveTimer = null;
    let submissionsCache = [];
    let activeAYFilter = 'All';
    let activeStatusFilter = 'All';

    /* ── View switching ── */
    function backToDashboard() {
      document.getElementById('dashView').style.display = 'block';
      document.getElementById('formView').style.display = 'none';
      document.getElementById('autosaveIndicator').className = 'autosave-indicator';
      state = null; dirty = false;
      loadDashboard();
      window.scrollTo(0, 0);
    }

    /* ── Terms & Conditions gate (shown before every new submission) ── */
    function startNewSubmission() {
      const ov = document.getElementById('termsOverlay');
      const body = document.getElementById('termsBody');
      const agree = document.getElementById('termsAgree');
      const label = document.getElementById('termsAgreeLabel');
      const agreeText = document.getElementById('termsAgreeText');
      const proceed = document.getElementById('termsProceed');
      // reset gate each time it opens
      agree.checked = false; agree.disabled = true;
      label.classList.remove('ready');
      agreeText.textContent = 'Please scroll down and read all the terms to continue.';
      proceed.disabled = true; proceed.style.opacity = '.5'; proceed.style.cursor = 'not-allowed';
      ov.classList.add('show');
      document.body.style.overflow = 'hidden';
      body.scrollTop = 0;
      // if the content is short enough that there's nothing to scroll, unlock immediately
      setTimeout(() => { if (body.scrollHeight - body.clientHeight <= 8) unlockTerms(); }, 60);
    }

    function unlockTerms() {
      const agree = document.getElementById('termsAgree');
      const agreeText = document.getElementById('termsAgreeText');
      if (!agree.disabled) return;
      agree.disabled = false;
      agreeText.textContent = 'I have read and understood the terms & conditions above.';
      document.getElementById('termsAgreeLabel').classList.add('ready');
    }

    function onTermsScroll() {
      const body = document.getElementById('termsBody');
      if (body.scrollTop + body.clientHeight >= body.scrollHeight - 24) unlockTerms();
    }

    function onAgreeChange() {
      const agree = document.getElementById('termsAgree');
      const proceed = document.getElementById('termsProceed');
      const on = agree.checked;
      proceed.disabled = !on;
      proceed.style.opacity = on ? '1' : '.5';
      proceed.style.cursor = on ? 'pointer' : 'not-allowed';
    }

    function closeTerms() {
      document.getElementById('termsOverlay').classList.remove('show');
      document.body.style.overflow = '';
    }

    function acceptTerms() {
      if (!document.getElementById('termsAgree').checked) return;
      closeTerms();
      enterNewSubmission();
    }

    // Actual new-submission form (entered only after accepting the terms)
    function enterNewSubmission() {
      document.getElementById('dashView').style.display = 'none';
      document.getElementById('formView').style.display = 'block';
      document.getElementById('formView').classList.add('animate-rise');
      schoolSelect.value = '';
      deptSelect.innerHTML = '<option value="">Select School first</option>'; deptSelect.disabled = true;
      levelSelect.innerHTML = '<option value="">Select Department first</option>'; levelSelect.disabled = true;
      document.getElementById('mainArea').style.display = 'none';
      document.getElementById('statusPill').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Select School, Department, and Programme Level to begin or resume a submission.';
      state = null;
      window.scrollTo(0, 0);
    }

    async function openSubmission(school, dept, level, acYear) {
      document.getElementById('dashView').style.display = 'none';
      document.getElementById('formView').style.display = 'block';
      document.getElementById('formView').classList.add('animate-rise');
      schoolSelect.value = school;
      deptSelect.innerHTML = '<option value="">Select Department</option>';
      if (DEPT_DATA[school]) { deptSelect.disabled = false; Object.keys(DEPT_DATA[school]).sort().forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; deptSelect.appendChild(o); }); deptSelect.value = dept; }
      levelSelect.innerHTML = '<option value="">Select Programme Level</option>';
      if (DEPT_DATA[school] && DEPT_DATA[school][dept]) { levelSelect.disabled = false; DEPT_DATA[school][dept].forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; levelSelect.appendChild(o); }); levelSelect.value = level; }
      await loadUnit(school, dept, level, acYear);
      window.scrollTo(0, 0);
    }

    /* ── Filter handlers ── */
    function filterAY(ay, btn) {
      activeAYFilter = ay;
      btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDashboard();
    }

    function filterStatus(status, btn) {
      activeStatusFilter = status;
      btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDashboard();
    }

    /* ── Dashboard ── */
    async function loadDashboard() {
      const list = document.getElementById('dashList');
      try {
        const res = await fetch('/api/iea/submissions');
        const data = await res.json();
        if (data.ok) {
          submissionsCache = data.submissions || [];
          renderDashboard();
        } else list.innerHTML = '<div class="empty-state">' + ICON.folder + '<h3>Error loading</h3><p>Could not load submissions.</p></div>';
      } catch (err) { list.innerHTML = '<div class="empty-state">' + ICON.folder + '<h3>Connection error</h3><p>' + err.message + '</p></div>'; }
    }

    function renderDashboard() {
      const list = document.getElementById('dashList');
      if (!submissionsCache.length) {
        list.innerHTML = '<div class="empty-state">' + ICON.folder + '<h3>No submissions yet</h3><p>Click "Start New Submission" to create your first IEA entry.</p></div>';
        return;
      }

      const filtered = submissionsCache.filter(s => {
        const isDraft = !s.submitted;
        let matchAY = activeAYFilter === 'All' || (s.yearCounts && s.yearCounts[activeAYFilter] > 0);
        let matchStatus = activeStatusFilter === 'All' ||
          (activeStatusFilter === 'Submitted' && !isDraft) ||
          (activeStatusFilter === 'Draft' && isDraft);
        return matchAY && matchStatus;
      });

      if (!filtered.length) {
        list.innerHTML = '<div class="empty-state">' + ICON.folder + '<h3>No matching submissions</h3><p>No submissions match the selected filters.</p></div>';
        return;
      }

      list.innerHTML = filtered.map((s) => {
        const when = s.lastUpdated ? new Date(s.lastUpdated + (s.lastUpdated.endsWith('Z') ? '' : 'Z')).toLocaleString() : 'N/A';
        const entryLabel = s.totalEntries + ' entr' + (s.totalEntries === 1 ? 'y' : 'ies');
        const isDraft = !s.submitted;
        const badge = isDraft
          ? '<span class="status-badge status-draft">' + ICON.edit + ' Draft</span>'
          : '<span class="status-badge status-submitted">' + ICON.check + ' Submitted' + (s.version > 1 ? ' · v' + s.version : '') + '</span>';
        const openLabel = isDraft ? ' Open IEA Form' : ' Edit Submission';
        const ayVal = s.acYear || 'AY 2025-26';
        const headerTags = '<div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:4px;">' +
          badge +
          '<span class="semester-tag" style="font-size:11px; background:var(--navy); color:#fff; font-weight:800; padding:2px 10px; border-radius:99px;">AY: ' + escapeHtml(ayVal) + '</span>' +
        '</div>';
        return '<div class="dash-card">' +
          '<div class="dc-left">' + headerTags +
          '<div class="dc-title">' + escapeHtml(s.department) + '</div>' +
          '<div class="dc-sub">Last saved: ' + when + ' · ' + escapeHtml(s.school) + ' · ' + escapeHtml(s.level) + '</div>' +
          '<div><span class="dc-tag">' + ICON.layers + ' ' + entryLabel + ' across ' + YEARS.length + ' years</span></div></div>' +
          '<div class="dc-right">' +
          '<button class="btn btn-gold" onclick="openSubmission(\'' + escapeHtml(s.school) + '\', \'' + escapeHtml(s.department) + '\', \'' + escapeHtml(s.level) + '\', \'' + escapeHtml(s.acYear || '') + '\')">' + ICON.edit + openLabel + '</button>' +
          '<button class="btn btn-ghost" onclick="deleteSubmission(\'' + s.id + '\', \'' + escapeHtml(s.department) + '\')" style="color:var(--danger);border-color:#f5b8b8">' + ICON.trash + ' Delete</button>' +
          '</div></div>';
      }).join('');
    }

    async function deleteSubmission(sid, deptName) {
      if (!confirm('Delete the submission for ' + deptName + '? This cannot be undone.')) return;
      try {
        const res = await fetch('/api/iea/delete/' + sid, { method: 'POST' });
        const json = await res.json();
        if (json.ok) { showToast('Deleted successfully'); loadDashboard(); }
        else showToast('Delete failed: ' + (json.error || 'Error'), true);
      } catch (err) { showToast('Error: ' + err.message, true); }
    }

    /* ── Cascading dropdowns ── */
    const schoolSelect = document.getElementById('schoolSelect');
    const deptSelect = document.getElementById('deptSelect');
    const levelSelect = document.getElementById('levelSelect');

    Object.keys(DEPT_DATA).sort().forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; schoolSelect.appendChild(o); });

    schoolSelect.addEventListener('change', () => {
      deptSelect.innerHTML = '<option value="">Select Department</option>';
      levelSelect.innerHTML = '<option value="">Select Department first</option>'; levelSelect.disabled = true;
      if (!schoolSelect.value) { deptSelect.disabled = true; deptSelect.innerHTML = '<option value="">Select School first</option>'; return; }
      deptSelect.disabled = false;
      Object.keys(DEPT_DATA[schoolSelect.value]).sort().forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; deptSelect.appendChild(o); });
    });
    deptSelect.addEventListener('change', () => {
      levelSelect.innerHTML = '<option value="">Select Programme Level</option>';
      if (!deptSelect.value) { levelSelect.disabled = true; return; }
      levelSelect.disabled = false;
      DEPT_DATA[schoolSelect.value][deptSelect.value].forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; levelSelect.appendChild(o); });
    });
    levelSelect.addEventListener('change', () => { if (levelSelect.value) loadUnit(schoolSelect.value, deptSelect.value, levelSelect.value, activeYear); });

    /* ── State helpers ── */
    function normYear(y) {
      return String(y || '').replace(/[\u2013\u2014]/g, '-').trim();
    }

    function ensureStateYear(y) {
      if (!state) return activeYear || YEARS[0];
      if (!state.years) state.years = emptyYears();
      const ny = normYear(y || activeYear || YEARS[0]);
      let key = Object.keys(state.years).find(k => normYear(k) === ny);
      if (!key) {
        key = YEARS.find(k => normYear(k) === ny) || ny;
        state.years[key] = {};
      }
      SECTIONS.forEach(s => {
        if (!Array.isArray(state.years[key][s.key])) state.years[key][s.key] = [];
      });
      return key;
    }

    function emptyYears() { const o = {}; YEARS.forEach(y => { o[y] = {}; SECTIONS.forEach(s => { o[y][s.key] = []; }); }); return o; }
    function slugify(s) { return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
    function genId() { return 'e' + Math.random().toString(36).slice(2, 9); }
    function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

    function emptyEntry(sectionKey) {
      const s = SECTIONS.find(x => x.key === sectionKey);
      const obj = { id: genId(), evidenceTypes: [], evidenceLink: '', evidenceMissing: '', evidenceDetails: {} };
      s.fields.forEach(f => obj[f.k] = '');
      return obj;
    }
    function mergeWithDefaults(parsed, school, dept, level, acYear) {
      const base = {
        school, department: dept, level,
        acYear: normYear(acYear || (parsed && parsed.acYear) || YEARS[0]),
        submitted: parsed ? (parsed.submitted || false) : false,
        submittedYears: (parsed && parsed.submittedYears) || {},
        years: emptyYears(), lastUpdated: (parsed && parsed.lastUpdated) || null
      };
      if (parsed && parsed.years) {
        const normParsed = {};
        Object.keys(parsed.years).forEach(k => { normParsed[normYear(k)] = parsed.years[k]; });
        YEARS.forEach(y => {
          const ny = normYear(y);
          if (normParsed[ny]) {
            SECTIONS.forEach(s => {
              if (Array.isArray(normParsed[ny][s.key])) {
                base.years[y][s.key] = normParsed[ny][s.key].map(e => Object.assign({ evidenceTypes: [], evidenceLink: '', evidenceMissing: '', evidenceDetails: {} }, e));
              }
            });
          }
        });
      }
      return base;
    }
    function totalEntries(st) { let n = 0; if (!st || !st.years) return 0; YEARS.forEach(y => { const yKey = ensureStateYear(y); SECTIONS.forEach(s => n += (st.years[yKey] && st.years[yKey][s.key]) ? st.years[yKey][s.key].length : 0); }); return n; }
    function unitLabel(st) { return st.school + ' — ' + st.department + ' (' + st.level + ')'; }

    async function loadUnit(school, dept, level, acYear) {
      document.getElementById('statusPill').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Loading...';
      let parsed = null;
      try {
        const res = await fetch('/api/iea/load?school=' + encodeURIComponent(school) + '&dept=' + encodeURIComponent(dept) + '&level=' + encodeURIComponent(level));
        const json = await res.json();
        if (json.ok && json.submission) parsed = json.submission;
      } catch (err) {}
      state = mergeWithDefaults(parsed, school, dept, level, acYear);
      activeYear = normYear(acYear || (parsed && parsed.acYear) || YEARS[0]);
      ensureStateYear(activeYear);
      selectedSections = [SECTIONS[0].key]; dirty = false;
      document.getElementById('mainArea').style.display = 'block';
      renderYearTabs(); renderSectionNavBar(); renderSections(); renderSubmitSection(); updateStatusPill();
    }

    function updateStatusPill() {
      const pill = document.getElementById('statusPill');
      const count = totalEntries(state);
      if (count === 0) { pill.innerHTML = ICON.fileText + ' No entries yet. Add entries in sections A–F below.'; pill.style.color = 'var(--ink3)'; }
      else { const when = state.lastUpdated ? new Date(state.lastUpdated + (state.lastUpdated.endsWith('Z') ? '' : 'Z')).toLocaleString() : 'never'; pill.innerHTML = ICON.check + ' ' + count + ' entries · Last saved: ' + when; pill.style.color = '#2F6F4E'; }
    }

    function switchAY(year) {
      activeYear = normYear(year);
      if (state) state.acYear = activeYear;
      ensureStateYear(activeYear);
      renderYearTabs();
      renderSectionNavBar();
      renderSections();
      renderSubmitSection();
    }

    function renderYearTabs() {
      const el = document.getElementById('yearTabsContainer');
      if (!el || !state) return;

      const sortedYears = [...YEARS].sort();
      const normActive = normYear(activeYear);
      const matchedYear = sortedYears.find(y => normYear(y) === normActive) || sortedYears[0];
      activeYear = matchedYear;

      const curYearKey = ensureStateYear(activeYear);

      let tabsHtml = '<div class="ay-tabs-box">';
      tabsHtml += '<div class="ay-tabs-title">' + ICON.layers + ' Select Academic Year (AY)</div>';
      tabsHtml += '<div class="ay-tabs-flex">';

      let activeYearEntries = 0;
      let activeYearSubmitted = false;

      sortedYears.forEach(y => {
        const isAct = (normYear(y) === normYear(activeYear));
        const yKey = ensureStateYear(y);
        let count = 0;
        if (state.years && state.years[yKey]) {
          SECTIONS.forEach(s => {
            count += (state.years[yKey][s.key] || []).length;
          });
        }
        const isSubmittedForY = (state.submitted || (state.submittedYears && (state.submittedYears[y] || state.submittedYears[yKey]))) && count > 0;
        if (isAct) {
          activeYearEntries = count;
          activeYearSubmitted = isSubmittedForY;
        }

        const badgeText = isSubmittedForY ? '✓ Submitted' : (count + ' entries');
        tabsHtml += '<button type="button" class="ay-tab-btn ' + (isAct ? 'active' : '') + '" onclick="switchAY(\'' + escapeHtml(y) + '\')">' +
          '<span>' + escapeHtml(y) + '</span>' +
          '<span class="ay-tab-badge">' + badgeText + '</span>' +
        '</button>';
      });

      tabsHtml += '</div>';

      if (activeYearSubmitted) {
        tabsHtml += '<div class="ay-status-banner submitted">' +
          ICON.check + ' You have been submitted for ' + escapeHtml(activeYear) + ' (' + activeYearEntries + ' entries).' +
        '</div>';
      } else {
        tabsHtml += '<div class="ay-status-banner pending">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
          'Pending submission for ' + escapeHtml(activeYear) + ' (' + activeYearEntries + ' entries so far).' +
        '</div>';
      }

      tabsHtml += '</div>';
      el.innerHTML = tabsHtml;
    }

    /* ── Section Navigation & Workflow ── */
    function selectSection(secKey) {
      // Tab-style single section navigation (A, B, C, D, E, F).
      if (secKey === 'All') secKey = SECTIONS[0].key;
      selectedSections = [secKey];
      renderSectionNavBar();
      renderSections();
    }

    function goToSection(secKey) {
      selectedSections = [secKey];
      renderSectionNavBar();
      renderSections();
      const el = document.getElementById('sec-panel-' + secKey);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 1800);
      }
    }

    function scrollToSubmit() {
      const el = document.getElementById('submitSection');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    let navViewMode = 'compact'; // 'compact' (round buttons) or 'expanded' (full cards)

    function toggleNavViewMode() {
      navViewMode = navViewMode === 'compact' ? 'expanded' : 'compact';
      renderSectionNavBar();
    }

    function renderSectionNavBar() {
      const container = document.getElementById('sectionNavWrapper');
      if (!container || !state) return;
      const curKey = ensureStateYear(activeYear);
      const isAll = false;
      const allCount = totalEntries(state);

      let activeLabelHtml = '';
      const activeSecObjs = SECTIONS.filter(s => selectedSections.includes(s.key));
      if (activeSecObjs.length >= 1) {
        const s = activeSecObjs[0];
        const c = (state.years[curKey] && state.years[curKey][s.key]) ? state.years[curKey][s.key].length : 0;
        activeLabelHtml = '<span class="nav-active-tag" style="background:' + s.color + ';color:#fff;">Section ' + s.key + ': ' + escapeHtml(s.title) + ' (' + c + ' ' + (c === 1 ? 'entry' : 'entries') + ')</span>';
      }

      let modeBtn = '<button class="btn-view-toggle" onclick="toggleNavViewMode()">' +
        (navViewMode === 'compact' ? ICON.plus + ' Expand Cards' : ICON.layers + ' Round Buttons') +
      '</button>';

      let html = '<div class="section-nav-header">' +
        '<div class="snh-left">' +
          '<span class="snh-title">' + ICON.layers + ' Section Navigation</span>' +
          activeLabelHtml +
        '</div>' +
        '<div class="snh-right">' +
          modeBtn +
        '</div>' +
      '</div>';

      if (navViewMode === 'compact') {
        // Render Round Buttons Row (A to F)
        html += '<div class="round-btn-container">';

        // Sections A to F Round Buttons
        SECTIONS.forEach(s => {
          const c = (state.years[curKey] && state.years[curKey][s.key]) ? state.years[curKey][s.key].length : 0;
          const isAct = !isAll && selectedSections.includes(s.key);
          html += '<button class="round-sec-btn ' + (isAct ? 'active' : '') + '" onclick="selectSection(\'' + s.key + '\')" style="--sec-color:' + s.color + ';" title="Section ' + s.key + ': ' + escapeHtml(s.title) + '">' +
            '<span class="btn-sec-letter">' + s.key + '</span>' +
            '<span class="btn-sec-label">Sec ' + s.key + '</span>' +
            (c > 0 ? '<span class="btn-badge-count">' + c + '</span>' : '') +
          '</button>';
        });

        html += '</div>';

      } else {
        // Expanded Grid View
        html += '<div class="section-boxes-grid">';

        SECTIONS.forEach(s => {
          const c = (state.years[curKey] && state.years[curKey][s.key]) ? state.years[curKey][s.key].length : 0;
          const isAct = !isAll && selectedSections.includes(s.key);
          html += '<div class="section-box-btn ' + (isAct ? 'active' : '') + '" onclick="selectSection(\'' + s.key + '\')" style="--sec-color:' + s.color + ';" title="' + escapeHtml(s.title) + '">' +
            '<div class="sb-header"><span class="sb-badge">' + s.key + '</span><span class="sb-count">' + c + ' ' + (c===1?'entry':'entries') + '</span></div>' +
            '<div class="sb-title">Section ' + s.key + ': ' + escapeHtml(s.title) + '</div>' +
            '<div class="sb-sub">' + (c > 0 ? ICON.check + ' ' + c + ' saved' : 'Click to view/edit') + '</div>' +
          '</div>';
        });

        html += '</div>';
      }

      container.innerHTML = html;
    }

    function renderSections() {
      const visible = SECTIONS.filter(s => selectedSections.includes('All') || selectedSections.includes(s.key));
      document.getElementById('sectionsContainer').innerHTML = visible.map(renderSectionPanel).join('');
    }

    function renderSectionPanel(s) {
      const curKey = ensureStateYear(activeYear);
      const entries = (state.years[curKey] && state.years[curKey][s.key]) ? state.years[curKey][s.key] : [];
      const secKeys = ['A', 'B', 'C', 'D', 'E', 'F'];
      const curIdx = secKeys.indexOf(s.key);
      const prevKey = curIdx > 0 ? secKeys[curIdx - 1] : null;
      const nextKey = curIdx < secKeys.length - 1 ? secKeys[curIdx + 1] : null;

      let workflowFooter = '<div class="workflow-footer">';
      workflowFooter += '<span class="workflow-step-badge">Section ' + s.key + ' &middot; Step ' + (curIdx + 1) + ' of ' + secKeys.length + '</span>';
      workflowFooter += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
      if (prevKey) {
        workflowFooter += '<button class="btn-workflow prev" onclick="goToSection(\'' + prevKey + '\')">&larr; Back to Section ' + prevKey + '</button>';
      }
      if (nextKey) {
        const nextSec = SECTIONS.find(x => x.key === nextKey);
        workflowFooter += '<button class="btn-workflow next" style="--accent:' + s.color + '" onclick="goToSection(\'' + nextKey + '\')">Next: Section ' + nextKey + ' (' + escapeHtml(nextSec ? nextSec.title.split(' ')[0] : '') + ') &rarr;</button>';
      } else {
        workflowFooter += '<button class="btn-workflow submit-btn" onclick="scrollToSubmit()">Review &amp; Submit Submission &darr;</button>';
      }
      workflowFooter += '</div></div>';

      return '<div class="section-panel" id="sec-panel-' + s.key + '" style="--accent:' + s.color + '">' +
        '<div class="section-banner"><div class="section-num">' + s.key + '</div><div class="section-title-wrap"><h3>' + s.title + '</h3><p class="section-sub">' + s.sub + '</p></div><div class="entry-count">' + entries.length + ' ' + (entries.length === 1 ? 'entry' : 'entries') + '</div></div>' +
        '<div class="entries">' + (entries.length === 0 ? '<p class="empty-hint">No entries yet for ' + activeYear + ' in Section ' + s.key + '.</p>' : entries.map((e, i) => renderEntryCard(s, e, i)).join('')) + '</div>' +
        '<div style="padding:0 20px 14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
          '<button class="add-entry-btn" data-action="add" data-section="' + s.key + '" style="margin:0;">' + ICON.plus + ' Add Entry to Section ' + s.key + '</button>' +
        '</div>' +
        workflowFooter +
      '</div>';
    }

    function renderEntryCard(s, e, idx) {
      return '<div class="entry-card" data-entry="' + e.id + '"><div class="entry-head"><span class="entry-idx">ENTRY #' + (idx + 1) + '</span><button class="remove-btn" data-action="remove" data-section="' + s.key + '" data-entry="' + e.id + '">' + ICON.x + ' Remove</button></div><div class="entry-fields">' + s.fields.map(f => renderField(s, e, f)).join('') + renderEvidenceBlock(s, e) + '</div></div>';
    }

    function renderField(s, e, f) {
      const val = e[f.k] || '', common = 'data-section="' + s.key + '" data-entry="' + e.id + '" data-field="' + f.k + '"';
      if (f.t === 'textarea') return '<label class="field-label full">' + f.l + '<textarea ' + common + ' rows="2" placeholder="' + escapeHtml(f.ph || '') + '">' + escapeHtml(val) + '</textarea></label>';
      if (f.t === 'rating10') {
        const curVal = parseInt(val) || 0;
        let starsHtml = '<div class="rating-scale-wrap" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;">';
        for (let i = 1; i <= 10; i++) {
          const active = i <= curVal;
          starsHtml += '<button type="button" class="star-pill-btn ' + (active ? 'active' : '') + '" onclick="setRatingValue(\'' + s.key + '\', \'' + e.id + '\', \'' + f.k + '\', ' + i + ')" title="' + i + ' out of 10 Stars">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="' + (active ? '#f2a900' : 'none') + '" stroke="' + (active ? '#f2a900' : '#94a3b8') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ' + i +
          '</button>';
        }
        starsHtml += '<span style="font-size:12.5px;font-weight:800;color:var(--navy);margin-left:8px;">' + (curVal > 0 ? curVal + ' / 10 Stars ⭐' : 'Click to rate (1–10)') + '</span>';
        starsHtml += '</div>';
        return '<label class="field-label full">' + f.l + starsHtml + '</label>';
      }
      return '<label class="field-label">' + f.l + '<input type="text" ' + common + ' value="' + escapeHtml(val) + '" placeholder="' + escapeHtml(f.ph || '') + '"/></label>';
    }

    function setRatingValue(secKey, entryId, fieldKey, val) {
      const entry = state.years[activeYear][secKey].find(x => x.id === entryId);
      if (entry) {
        entry[fieldKey] = String(val);
        saveState();
        renderSections();
      }
    }

    function renderEvidenceBlock(s, e) {
      if (s.key === 'F') return '';
      if (!e.evidenceDetails) e.evidenceDetails = {};
      const chips = EVIDENCE_TYPES.map(type => {
        const checked = Array.isArray(e.evidenceTypes) && e.evidenceTypes.indexOf(type) > -1;
        return '<label class="evidence-chip-label ' + (checked ? 'selected' : '') + '"><input type="checkbox" data-section="' + s.key + '" data-entry="' + e.id + '" data-field="evidenceTypes" data-value="' + escapeHtml(type) + '" ' + (checked ? 'checked' : '') + '> <span>' + escapeHtml(type) + '</span></label>';
      }).join('');

      let details = '';
      if (Array.isArray(e.evidenceTypes) && e.evidenceTypes.length > 0) {
        details = '<div class="evidence-details-container">' + e.evidenceTypes.map(type => {
          const d = e.evidenceDetails[type] || {};
          return '<div class="evidence-detail-card"><div class="evidence-detail-title">' + ICON.shield + ' ' + escapeHtml(type) + '</div><div class="evidence-detail-grid"><div><label style="font-size:11.5px;font-weight:700;color:var(--ink2);display:flex;align-items:center;gap:4px;">' + ICON.upload + ' Upload File:</label><div class="file-upload-btn-wrap">' +
            (d.fileUrl ? '<span class="uploaded-file-badge"><a href="' + escapeHtml(d.fileUrl) + '" target="_blank">' + escapeHtml(d.fileName || 'File') + '</a> <span class="btn-remove-file" onclick="removeEvidenceFile(\'' + s.key + '\',\'' + e.id + '\',\'' + escapeHtml(type) + '\')">' + ICON.x + '</span></span>'
              : '<button type="button" class="btn-file-upload" onclick="triggerFileUpload(\'' + s.key + '\',\'' + e.id + '\',\'' + escapeHtml(type) + '\')">' + ICON.upload + ' Upload</button>') +
            '</div></div><div><label style="font-size:11.5px;font-weight:700;color:var(--ink2);display:flex;align-items:center;gap:4px;">' + ICON.link + ' Drive / Web URL:</label><input type="text" style="width:100%;font-size:12px;padding:6px 8px;border:1.5px solid #dde3f0;border-radius:6px;margin-top:4px;" placeholder="https://drive.google.com/..." value="' + escapeHtml(d.driveLink || '') + '" onchange="updateEvidenceDetail(\'' + s.key + '\',\'' + e.id + '\',\'' + escapeHtml(type) + '\',\'driveLink\',this.value)"></div></div><div style="margin-top:8px;"><label style="font-size:11.5px;font-weight:700;color:var(--ink2);">Notes (if pending):</label><input type="text" style="width:100%;font-size:12px;padding:6px 8px;border:1.5px solid #dde3f0;border-radius:6px;margin-top:4px;" placeholder="e.g. BoS approval expected Aug 2026" value="' + escapeHtml(d.notes || '') + '" onchange="updateEvidenceDetail(\'' + s.key + '\',\'' + e.id + '\',\'' + escapeHtml(type) + '\',\'notes\',this.value)"></div></div>';
        }).join('') + '</div>';
      }
      return '<div class="evidence-block"><div class="evidence-block-head"><h5>' + ICON.shield + ' Supporting Evidence</h5></div><div class="evidence-chips">' + chips + '</div>' + details + '</div>';
    }

    /* ── Submit section (after section E) ── */
    function renderSubmitSection() {
      const el = document.getElementById('submitSection');
      const count = totalEntries(state);
      const sectionCounts = SECTIONS.map(s => {
        let c = 0; YEARS.forEach(y => c += state.years[y][s.key].length);
        return '<div class="stat-chip"><span style="width:22px;height:22px;border-radius:6px;background:' + s.color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">' + s.key + '</span> ' + c + ' entries</div>';
      }).join('');
      el.innerHTML = '<div class="submit-section"><h3>' + ICON.send + ' Ready to Submit?</h3><p>Review your entries across all sections and academic years before submitting.</p><div class="submit-stats">' + sectionCounts + '</div><div class="submit-actions"><button class="btn btn-ghost" onclick="downloadBackup()">' + ICON.download + ' Download Backup</button><button class="btn btn-success" onclick="submitFinal()" ' + (count === 0 ? 'disabled style="opacity:.5;cursor:not-allowed;"' : '') + '>' + ICON.send + ' Submit (' + count + ' entries)</button></div></div>';
    }

    /* ── Auto-save ── */
    function scheduleAutoSave() {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => doAutoSave(), 2000);
    }

    async function doAutoSave() {
      if (!state || totalEntries(state) === 0) return;
      showAutosave('saving');
      try {
        const payload = {
          school: state.school,
          department: state.department,
          level: state.level,
          acYear: activeYear || state.acYear || YEARS[0],
          years: state.years
        };
        const res = await fetch('/api/iea/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.ok) { state.lastUpdated = json.lastUpdated; dirty = false; updateStatusPill(); showAutosave('saved'); }
        else showAutosave('error');
      } catch (err) { showAutosave('error'); }
    }

    function showAutosave(status) {
      const el = document.getElementById('autosaveIndicator');
      const text = document.getElementById('autosaveText');
      el.className = 'autosave-indicator show ' + status;
      if (status === 'saving') { text.textContent = 'Auto-saving...'; }
      else if (status === 'saved') { text.textContent = 'Saved'; setTimeout(() => { el.className = 'autosave-indicator'; }, 2500); }
      else if (status === 'error') { text.textContent = 'Save failed'; setTimeout(() => { el.className = 'autosave-indicator'; }, 4000); }
    }

    /* ── Final submit ── (nothing is mandatory; any entries can be submitted) */
    async function submitFinal() {
      if (!state) { showToast('Select a reporting unit first.', true); return; }
      if (totalEntries(state) === 0) { showToast('Add at least one entry before submitting.', true); return; }
      try {
        const payload = {
          school: state.school,
          department: state.department,
          level: state.level,
          acYear: activeYear || state.acYear || YEARS[0],
          years: state.years
        };
        const res = await fetch('/api/iea/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.ok) {
          dirty = false;
          state.submitted = true;
          if (!state.submittedYears) state.submittedYears = {};
          state.submittedYears[activeYear] = true;
          renderYearTabs();
          showToast(json.version > 1 ? ('Submitted — saved as edited Version ' + json.version + '.') : 'Submitted successfully!');
          backToDashboard();
        } else showToast('Submit failed: ' + (json.error || 'Error'), true);
      } catch (err) { showToast('Submit failed: ' + err.message, true); }
    }

    /* ── Evidence file upload ── */
    function triggerFileUpload(sk, eid, type) {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip';
      inp.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const fd = new FormData(); fd.append('file', file); showToast('Uploading...');
        try {
          const res = await fetch('/api/iea/upload', { method: 'POST', body: fd });
          const json = await res.json();
          if (json.ok) { updateEvidenceDetail(sk, eid, type, 'fileUrl', json.url); updateEvidenceDetail(sk, eid, type, 'fileName', json.filename); showToast('Uploaded!'); renderSections(); }
          else showToast('Error: ' + (json.error || 'Failed'), true);
        } catch (err) { showToast('Error: ' + err.message, true); }
      };
      inp.click();
    }
    function removeEvidenceFile(sk, eid, type) { updateEvidenceDetail(sk, eid, type, 'fileUrl', ''); updateEvidenceDetail(sk, eid, type, 'fileName', ''); renderSections(); }
    function updateEvidenceDetail(sk, eid, type, key, val) {
      const curKey = ensureStateYear(activeYear);
      const entry = (state.years[curKey] && state.years[curKey][sk]) ? state.years[curKey][sk].find(e => e.id === eid) : null;
      if (!entry) return;
      if (!entry.evidenceDetails) entry.evidenceDetails = {};
      if (!entry.evidenceDetails[type]) entry.evidenceDetails[type] = {};
      entry.evidenceDetails[type][key] = val;
      if (type.includes('Google Drive') && key === 'driveLink') entry.evidenceLink = val;
      dirty = true; scheduleAutoSave();
    }

    function addEntry(sk) {
      const curKey = ensureStateYear(activeYear);
      const newEntry = emptyEntry(sk);
      if (!Array.isArray(state.years[curKey][sk])) state.years[curKey][sk] = [];
      state.years[curKey][sk].push(newEntry);
      dirty = true;
      selectedSections = [sk];
      renderYearTabs();
      renderSectionNavBar();
      renderSections();
      renderSubmitSection();
      scheduleAutoSave();
      setTimeout(() => {
        const el = document.querySelector('.entry-card[data-entry="' + newEntry.id + '"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 1800);
        }
      }, 50);
    }
    function removeEntry(sk, eid) {
      if (!confirm('Remove this entry?')) return;
      const curKey = ensureStateYear(activeYear);
      if (state.years[curKey] && state.years[curKey][sk]) {
        state.years[curKey][sk] = state.years[curKey][sk].filter(e => e.id !== eid);
      }
      dirty = true; renderYearTabs(); renderSectionNavBar(); renderSections(); renderSubmitSection(); scheduleAutoSave();
    }
    function updateField(sk, eid, fk, val) {
      const curKey = ensureStateYear(activeYear);
      const entry = (state.years[curKey] && state.years[curKey][sk]) ? state.years[curKey][sk].find(e => e.id === eid) : null;
      if (entry) { entry[fk] = val; dirty = true; scheduleAutoSave(); }
    }
    function toggleEvidenceType(sk, eid, val, checked) {
      const curKey = ensureStateYear(activeYear);
      const entry = (state.years[curKey] && state.years[curKey][sk]) ? state.years[curKey][sk].find(e => e.id === eid) : null;
      if (!entry) return;
      if (!Array.isArray(entry.evidenceTypes)) entry.evidenceTypes = [];
      const idx = entry.evidenceTypes.indexOf(val);
      if (checked && idx === -1) { entry.evidenceTypes.push(val); if (!entry.evidenceDetails) entry.evidenceDetails = {}; if (!entry.evidenceDetails[val]) entry.evidenceDetails[val] = { fileUrl: '', fileName: '', driveLink: '', notes: '' }; }
      if (!checked && idx > -1) entry.evidenceTypes.splice(idx, 1);
      dirty = true; renderSections(); scheduleAutoSave();
    }

    function showToast(msg, isErr) { const t = document.getElementById('toast'); t.innerHTML = (isErr ? ICON.x : ICON.check) + ' ' + msg; t.className = 'toast show' + (isErr ? ' err' : ''); clearTimeout(t._timer); t._timer = setTimeout(() => t.className = 'toast', isErr ? 4200 : 2400); }

    function findIncompleteEntry() {
      for (const y of YEARS) for (const s of SECTIONS) { const arr = state.years[y][s.key]; for (let i = 0; i < arr.length; i++) if (!String(arr[i][s.fields[0].k] || '').trim()) return { year: y, section: s, idx: i, entry: arr[i] }; }
      return null;
    }
    function highlightEntry(bad) { activeYear = bad.year; renderYearTabs(); renderSectionNavBar(); renderSections(); const el = document.querySelector('.entry-card[data-entry="' + bad.entry.id + '"]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2500); } }

    function downloadBackup() {
      if (!state) return;
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'IEA_' + slugify(state.school) + '_' + slugify(state.department) + '_' + slugify(state.level) + '_backup.json'; a.click();
    }

    /* ── Event delegation ── */
    document.getElementById('yearTabs').addEventListener('click', e => { const b = e.target.closest('.year-tab'); if (b) { activeYear = b.dataset.year; renderYearTabs(); renderSectionNavBar(); renderSections(); } });
    document.getElementById('sectionsContainer').addEventListener('click', e => { const b = e.target.closest('[data-action]'); if (!b) return; if (b.dataset.action === 'add') addEntry(b.dataset.section); if (b.dataset.action === 'remove') removeEntry(b.dataset.section, b.dataset.entry); });
    document.getElementById('sectionsContainer').addEventListener('input', e => { const t = e.target; if (t.type === 'checkbox' && t.dataset.field === 'evidenceTypes') return; if (t.dataset.field) updateField(t.dataset.section, t.dataset.entry, t.dataset.field, t.value); });
    document.getElementById('sectionsContainer').addEventListener('change', e => { const t = e.target; if (t.type === 'checkbox' && t.dataset.field === 'evidenceTypes') toggleEvidenceType(t.dataset.section, t.dataset.entry, t.dataset.value, t.checked); });

    /* ── Portal feedback (home page) ── */
    let fbRating = 0;
    function renderFbStars() {
      const wrap = document.getElementById('fbStars');
      if (!wrap) return;
      let html = '';
      for (let i = 1; i <= 10; i++) {
        const on = i <= fbRating;
        html += '<button type="button" onclick="setFbRating(' + i + ')" title="' + i + ' / 10" ' +
          'style="background:none; border:none; cursor:pointer; padding:2px; line-height:0;">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="' + (on ? '#f5b301' : 'none') + '" stroke="' + (on ? '#f5b301' : '#c8d0e0') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>';
      }
      wrap.innerHTML = html + '<span style="margin-left:8px; font-size:13px; font-weight:700; color:var(--navy); align-self:center;">' + (fbRating ? fbRating + ' / 10' : '') + '</span>';
    }
    function setFbRating(n) { fbRating = n; renderFbStars(); }

    function openFeedback() {
      renderFbStars();
      document.getElementById('fbOverlay').classList.add('show');
      document.body.style.overflow = 'hidden';
    }
    function closeFeedback() {
      document.getElementById('fbOverlay').classList.remove('show');
      document.body.style.overflow = '';
    }

    async function submitFeedback() {
      const like = document.getElementById('fbLike').value.trim();
      const comments = document.getElementById('fbComments').value.trim();
      if (!like && !fbRating && !comments) { showToast('Please share some feedback before submitting.', true); return; }
      try {
        const res = await fetch('/api/iea/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ like, rating: fbRating, comments })
        });
        const json = await res.json();
        if (json.ok) {
          showToast('Thank you! Your feedback has been submitted.');
          document.getElementById('fbLike').value = '';
          document.getElementById('fbComments').value = '';
          fbRating = 0; renderFbStars();
          closeFeedback();
        } else showToast('Could not submit: ' + (json.error || 'Error'), true);
      } catch (err) { showToast('Error: ' + err.message, true); }
    }

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (document.getElementById('termsOverlay').classList.contains('show')) closeTerms();
      else if (document.getElementById('fbOverlay').classList.contains('show')) closeFeedback();
    });

    // Boot
    renderFbStars();
    loadDashboard();
  