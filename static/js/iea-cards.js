/* ══════════════════════════════════════════════════════════════
   IEA School → Department card grid (shared renderer).

   Used by /admin/iea and the public /iea-analysis page so the two
   never drift apart. Mount once, then drive it with setYear /
   setSearch / setDataFilter.

     IEACards.mount({
       mountId:   'cardsWrap',
       units:     [...],        // iea submissions, years already normalised
       years:     [...],        // IEA_YEARS
       sections:  [...],        // IEA_SECTIONS
       canDelete: false,        // show the delete button
       canExport: false,        // show Excel download buttons
       focus:     {school, department, level} | null,
       onChange:  fn(state)     // after every render, for KPI sync
     });
   ══════════════════════════════════════════════════════════════ */
window.IEACards = (function () {
  'use strict';

  var ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  };

  var cfg = null;
  var yearFilter = '';        // '' = every academic year
  var searchTerm = '';
  var schoolFilter = '';      // exact school name, '' = all
  var deptFilter = '';        // exact department name, '' = all
  var dataFilter = 'with_data';
  var expandedUnit = null;
  var lastVisible = [];       // units shown by the most recent render
  var focus = null;           // {school, department, level} when opened via share link

  // Some stored entries arrived HTML-escaped. Decode once before we escape for
  // output, otherwise "today&#39;s" renders as literal entity text.
  var _decoder = null;
  function decodeStored(str) {
    var v = String(str == null ? '' : str);
    if (v.indexOf('&') === -1) return v;
    if (!_decoder) _decoder = document.createElement('textarea');
    _decoder.innerHTML = v;          // textarea parses as text — no script can run
    return _decoder.value;
  }
  function escText(str) { return esc(decodeStored(str)); }

  // House style: names read with the word "and", not an ampersand.
  function niceName(str) {
    return decodeStored(str).replace(/\s*&\s*/g, ' and ');
  }
  function escName(str) { return esc(niceName(str)); }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch];
    });
  }

  /* ── Counting ─────────────────────────────────────────── */
  // The host page's KPI code may call these before mount(), so never assume cfg.
  function sectionList() { return (cfg && cfg.sections) || []; }
  function yearList() { return (cfg && cfg.years) || []; }

  function entriesIn(u, year, sectionKey) {
    return (u && u.years && u.years[year] && u.years[year][sectionKey]) ? u.years[year][sectionKey] : [];
  }
  function countForYear(u, year) {
    return sectionList().reduce(function (n, s) { return n + entriesIn(u, year, s.key).length; }, 0);
  }
  function filledYears(u) {
    return yearList().filter(function (y) { return countForYear(u, y) > 0; });
  }
  function scopeYears() { return yearFilter ? [yearFilter] : yearList(); }
  function unitId(u) { return u._id; }

  function lastUpdatedText(u) {
    if (!u.lastUpdated) return '—';
    var raw = String(u.lastUpdated);
    return new Date(raw + (raw.slice(-1) === 'Z' ? '' : 'Z')).toLocaleString();
  }

  /* ── Public share link for one department ─────────────── */
  function shareLinkFor(u) {
    return location.origin + '/iea-analysis?school=' + encodeURIComponent(u.school) +
      '&dept=' + encodeURIComponent(u.department) + '&level=' + encodeURIComponent(u.level);
  }

  function schoolShareLink(school) {
    return location.origin + '/iea-analysis?school=' + encodeURIComponent(school);
  }

  // Public export — same scoping rules as the analysis page it sits beside.
  function exportUrlFor(u, year) {
    return '/iea-export?sid=' + encodeURIComponent(unitId(u)) +
      (year ? '&year=' + encodeURIComponent(year) : '');
  }
  function schoolExportUrl(school, year) {
    return '/iea-export?school=' + encodeURIComponent(school) +
      (year ? '&year=' + encodeURIComponent(year) : '');
  }

  function copyShareLink(id, btn) {
    var u = findUnit(id);
    if (!u) return;
    copyText(shareLinkFor(u), btn);
  }

  function copyText(link, btn) {
    var original = btn.innerHTML;
    var done = function () {
      btn.classList.add('copied');
      btn.innerHTML = ICON.check + ' Copied';
      setTimeout(function () { btn.classList.remove('copied'); btn.innerHTML = original; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(done, function () { window.prompt('Copy this link:', link); });
    } else {
      window.prompt('Copy this link:', link);
    }
  }

  function findUnit(id) {
    for (var i = 0; i < cfg.units.length; i++) {
      if (unitId(cfg.units[i]) === id) return cfg.units[i];
    }
    return null;
  }

  function matchesFocus(u) {
    if (!focus) return false;
    if (u.school !== focus.school) return false;
    if (!focus.department) return true;          // school-wide share link
    return u.department === focus.department && u.level === focus.level;
  }

  /* ── Render ───────────────────────────────────────────── */
  function render() {
    var el = document.getElementById(cfg.mountId);
    if (!el) return;

    if (!cfg.units.length) {
      lastVisible = [];
      el.innerHTML = '<div class="iea-empty-state">' + ICON.folder +
        '<h3>No submissions yet</h3><p>Once departments save data, they will appear here as cards.</p></div>';
      notify(0, 0);
      return;
    }

    var scope = scopeYears();
    var q = searchTerm.trim().toLowerCase();

    var visible = cfg.units.filter(function (u) {
      if (focus) return matchesFocus(u);
      if (schoolFilter && u.school !== schoolFilter) return false;
      if (deptFilter && u.department !== deptFilter) return false;
      var haystack = [u.school, u.department, u.level, u.submitterName, u.submitterEmail].join(' ').toLowerCase();
      if (q && haystack.indexOf(q) === -1) return false;
      if (dataFilter === 'all') return true;
      var has = scope.some(function (y) { return countForYear(u, y) > 0; });
      return dataFilter === 'draft' ? !has : has;
    });

    lastVisible = visible;
    // Choosing one department from the pickers opens it straight away.
    if (deptFilter && visible.length === 1) expandedUnit = unitId(visible[0]);

    var banner = '';
    if (focus) {
      var f = visible[0];
      var isSchoolWide = !focus.department;
      banner = '<div class="focus-banner">' +
        '<div>' +
          '<div class="fb-eyebrow">' +
            (isSchoolWide ? 'School analysis' : escName(focus.school)) + '</div>' +
          '<div class="fb-title">' +
            (isSchoolWide ? escName(focus.school)
                          : escName(focus.department) + ' · ' + escName(focus.level)) + '</div>' +
          '<div class="fb-sub">' + (f
            ? (isSchoolWide
                ? 'Showing every department in this school across all academic years.'
                : 'Showing this department\'s Innovation and Emerging Areas analysis across all academic years.')
            : 'No submission has been recorded yet.') + '</div>' +
        '</div>' +
        '<div class="fb-actions">' +
          '<button class="fb-btn" data-copyschool="' + esc(focus.school) + '">' + ICON.link + ' Copy this link</button>' +
          '<a class="fb-btn" href="' + (isSchoolWide
              ? schoolExportUrl(focus.school, yearFilter)
              : (f ? exportUrlFor(f, yearFilter) : '#')) + '">' + ICON.download + ' Excel</a>' +
        '</div>' +
      '</div>';
    }

    if (!visible.length) {
      lastVisible = [];
      el.innerHTML = banner + '<div class="iea-empty-state">' + ICON.folder +
        '<h3>No departments match</h3><p>Try clearing the search, choosing another academic year, or switching to "Show All Departments".</p></div>';
      notify(0, 0);
      return;
    }

    // group by school, alphabetical
    var bySchool = {};
    visible.forEach(function (u) {
      if (!bySchool[u.school]) bySchool[u.school] = [];
      bySchool[u.school].push(u);
    });
    var schools = Object.keys(bySchool).sort();

    var html = schools.map(function (school, si) {
      var units = bySchool[school].sort(function (a, b) {
        return (a.department + a.level).localeCompare(b.department + b.level);
      });
      var schoolEntries = units.reduce(function (n, u) {
        return n + scope.reduce(function (m, y) { return m + countForYear(u, y); }, 0);
      }, 0);
      var reporting = units.filter(function (u) {
        return scope.some(function (y) { return countForYear(u, y) > 0; });
      }).length;

      var cards = units.map(function (u) { return renderCard(u); }).join('');

      return '<div class="school-block" style="animation-delay:' + (si * 0.04) + 's">' +
        '<div class="school-head">' +
          '<div class="sh-left">' +
            '<h2>' + escName(school) + '</h2>' +
            '<span class="school-meta">' + reporting + ' of ' + units.length + ' departments reporting · ' +
              schoolEntries + ' ' + (schoolEntries === 1 ? 'entry' : 'entries') +
              (yearFilter ? ' in ' + escName(yearFilter) : ' across all years') + '</span>' +
          '</div>' +
          (focus ? '' :
            '<div class="sh-actions">' +
              '<button class="card-btn" data-copyschool="' + esc(school) + '" title="Share this school\'s analysis">' +
                ICON.link + ' Copy school link</button>' +
              '<a class="card-btn" href="' + schoolExportUrl(school, yearFilter) + '" title="Excel for every department in this school">' +
                ICON.download + ' School Excel</a>' +
            '</div>') +
        '</div>' +
        '<div class="dept-grid">' + cards + '</div>' +
      '</div>';
    }).join('');

    el.innerHTML = banner + html;
    wireEvents(el);

    var totalEntries = visible.reduce(function (n, u) {
      return n + scope.reduce(function (m, y) { return m + countForYear(u, y); }, 0);
    }, 0);
    notify(visible.length, totalEntries);
  }

  function renderCard(u) {
    var filled = filledYears(u);
    var isOpen = expandedUnit === unitId(u) || (focus && matchesFocus(u));
    var hasData = filled.length > 0;

    var chips = cfg.years.map(function (y) {
      var n = countForYear(u, y);
      return '<span class="' + (n > 0 ? 'yr filled' : 'yr blank') + '" title="' + esc(y) + ': ' + n +
        ' ' + (n === 1 ? 'entry' : 'entries') + '">' +
        esc(String(y).replace('AY ', '')) + (n > 0 ? ' · ' + n : '') + '</span>';
    }).join('');

    var who = (u.submitterName || u.submitterEmail)
      ? esc(u.submitterName || '') + (u.submitterEmail ? ' · ' + esc(u.submitterEmail) : '')
      : 'No submitter recorded';

    var actions =
      '<button class="card-btn" data-unit="' + unitId(u) + '">' + ICON.eye + ' ' +
        (isOpen ? 'Hide' : 'View all years') + '</button>' +
      '<button class="card-btn" data-link="' + unitId(u) + '">' + ICON.link + ' Copy link</button>' +
      '<a class="card-btn" href="' + exportUrlFor(u, yearFilter) + '" title="Excel — one tab per year">' +
        ICON.download + ' Excel</a>' +
      (cfg.canDelete
        ? '<button class="card-btn danger" data-del="' + unitId(u) + '">' + ICON.trash + '</button>'
        : '');

    var card =
      '<div class="dept-card' + (isOpen ? ' is-open' : '') + (hasData ? '' : ' no-data') + '">' +
        '<div class="dc-school">' + escName(u.school) + '</div>' +
        '<div class="dc-top">' +
          '<div class="dc-name">' + escName(u.department) + '</div>' +
          '<span class="level-badge">' + escName(u.level) + '</span>' +
        '</div>' +
        '<div class="dc-sub">' + who + '<br>Last updated: ' + lastUpdatedText(u) + '</div>' +
        '<div class="years-row">' + chips + '</div>' +
        '<div class="dc-foot">' +
          '<span class="yr-count">' + filled.length + ' <span class="of">of ' + cfg.years.length + ' years filled</span></span>' +
          '<div class="dc-actions">' + actions + '</div>' +
        '</div>' +
      '</div>';

    return card + (isOpen ? renderUnitDetail(u) : '');
  }

  /* ── Detail panel: one tab per year + an Analysis tab ─── */
  var ANALYSIS_TAB = '__analysis';
  var detailTab = {};   // unitId -> active tab ('AY ...' or '__analysis')

  function detailYears(u) {
    var filled = filledYears(u);
    return yearFilter ? filled.filter(function (y) { return y === yearFilter; }) : filled;
  }

  function activeTabFor(u) {
    var shown = detailYears(u);
    var t = detailTab[unitId(u)];
    if (t === ANALYSIS_TAB) return t;
    if (t && shown.indexOf(t) > -1) return t;
    return shown.length ? shown[0] : ANALYSIS_TAB;
  }

  function renderUnitDetail(u) {
    var shown = detailYears(u);
    var active = activeTabFor(u);
    var id = unitId(u);

    var head =
      '<div class="detail-panel-head">' +
        '<div>' +
          '<div class="dp-school">' + escName(u.school) + '</div>' +
          '<h3>' + escName(u.department) + ' · ' + escName(u.level) + '</h3>' +
          '<div class="dp-sub">' + shown.length + ' of ' + cfg.years.length +
            ' academic years filled. Pick a year below, or open Analysis for the overview.</div>' +
        '</div>' +
        '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
          '<a class="card-btn" href="' + exportUrlFor(u) + '">' + ICON.download + ' All years (.xlsx)</a>' +
        '</div>' +
      '</div>' +
      '<div class="share-note"><b>Share link for this department:</b> ' + esc(shareLinkFor(u)) +
        (u.submitterEmail ? '<br><b>Filled by:</b> ' + esc(u.submitterEmail) : '') + '</div>';

    if (!shown.length) {
      return '<div class="detail-panel">' + head +
        '<div class="year-empty" style="margin-top:12px;">This department has not filled any entries' +
        (yearFilter ? ' for ' + esc(yearFilter) : ' yet') + '.</div></div>';
    }

    // Tab strip: every filled year, then Analysis
    var tabs = shown.map(function (y) {
      var n = countForYear(u, y);
      return '<button class="dt-tab' + (active === y ? ' active' : '') + '" data-tab="' + id + '|' + esc(y) + '">' +
        esc(y) + '<span class="dt-tab-badge">' + n + '</span></button>';
    }).join('') +
      '<button class="dt-tab analysis' + (active === ANALYSIS_TAB ? ' active' : '') + '" data-tab="' + id + '|' + ANALYSIS_TAB + '">' +
        ICON.chart + ' Analysis</button>';

    var body = (active === ANALYSIS_TAB)
      ? renderAnalysis(u, shown)
      : renderYearPane(u, active);

    return '<div class="detail-panel">' + head +
      '<div class="dt-tabs">' + tabs + '</div>' +
      '<div class="dt-pane">' + body + '</div>' +
    '</div>';
  }

  function renderYearPane(u, y) {
    var n = countForYear(u, y);
    var withEntries = cfg.sections.filter(function (s) { return entriesIn(u, y, s.key).length > 0; });
    var without = cfg.sections.filter(function (s) { return entriesIn(u, y, s.key).length === 0; });

    var body = withEntries.map(function (s) { return renderSection(u, y, s); }).join('') +
      (without.length
        ? '<div class="empty-sections">No entries for section' + (without.length > 1 ? 's' : '') + ' ' +
          without.map(function (s) { return s.key; }).join(', ') + '.</div>'
        : '');

    return '<div class="year-block">' +
      '<div class="year-block-head">' +
        '<span class="yb-title">' + esc(y) + '</span>' +
        '<span class="yb-count">' + n + ' ' + (n === 1 ? 'entry' : 'entries') +
          ' · <a href="' + exportUrlFor(u, y) + '" style="color:#2563eb;">Excel</a>' +
        '</span>' +
      '</div>' +
      '<div class="year-block-body">' + body + '</div>' +
    '</div>';
  }

  /* ── Charts (inline SVG, no external library) ─────────── */
  function donutChart(data, size) {
    var total = data.reduce(function (n, d) { return n + d.value; }, 0);
    if (!total) return '<div class="chart-empty">No entries to chart.</div>';

    var cx = size / 2, cy = size / 2, r = size / 2 - 4, ir = r * 0.58;
    var nonZero = data.filter(function (d) { return d.value > 0; });
    var svg = '';

    if (nonZero.length === 1) {
      // A single slice is a full ring — arc maths degenerates at 360°.
      svg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((r + ir) / 2) + '" fill="none" stroke="' +
        nonZero[0].color + '" stroke-width="' + (r - ir) + '"><title>' + esc(nonZero[0].label) +
        ': ' + nonZero[0].value + ' (100%)</title></circle>';
    } else {
      var angle = -Math.PI / 2;
      nonZero.forEach(function (d) {
        var sweep = (d.value / total) * Math.PI * 2;
        var end = angle + sweep;
        var large = sweep > Math.PI ? 1 : 0;
        var x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
        var x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
        var x3 = cx + ir * Math.cos(end), y3 = cy + ir * Math.sin(end);
        var x4 = cx + ir * Math.cos(angle), y4 = cy + ir * Math.sin(angle);
        var pct = Math.round((d.value / total) * 100);
        svg += '<path d="M' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
          ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
          ' L' + x3.toFixed(2) + ' ' + y3.toFixed(2) +
          ' A' + ir + ' ' + ir + ' 0 ' + large + ' 0 ' + x4.toFixed(2) + ' ' + y4.toFixed(2) + ' Z" fill="' +
          d.color + '"><title>' + esc(d.label) + ': ' + d.value + ' (' + pct + '%)</title></path>';
        angle = end;
      });
    }

    return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img">' +
      svg +
      '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="26" font-weight="800" fill="#0a2558">' + total + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10" font-weight="700" fill="#6b7280">ENTRIES</text>' +
      '</svg>';
  }

  function barChart(data, opts) {
    opts = opts || {};
    var max = data.reduce(function (n, d) { return Math.max(n, d.value); }, 0);
    if (!max) return '<div class="chart-empty">No entries to chart.</div>';
    return '<div class="bar-chart">' + data.map(function (d) {
      var pct = (d.value / max) * 100;
      return '<div class="bar-row" title="' + esc(d.label) + ': ' + d.value + '">' +
        '<span class="bar-label">' + esc(d.label) + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct.toFixed(1) + '%; background:' +
          (d.color || '#0a2558') + ';"></span></span>' +
        '<span class="bar-value">' + d.value + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  /* ── Submission history: registered → each edited version ─ */
  function fmtDateTime(v) {
    if (!v) return '—';
    var raw = String(v);
    var d = new Date(raw + (raw.slice(-1) === 'Z' || raw.indexOf('Z') > -1 ? '' : 'Z'));
    return isNaN(d.getTime()) ? esc(raw) : d.toLocaleString();
  }

  function renderTimeline(u) {
    var versions = u.versions || [];
    var submittedYears = u.submittedYears || {};

    var rows = '<div class="tl-row start">' +
      '<span class="tl-dot"></span>' +
      '<div class="tl-body">' +
        '<div class="tl-title">Started filling' +
          (u.createdAtEstimated ? ' <span class="tl-est" title="Recorded before this was tracked — earliest known activity">estimated</span>' : '') +
        '</div>' +
        '<div class="tl-meta">' + fmtDateTime(u.createdAt) +
          (u.submitterName || u.submitterEmail
            ? ' · ' + esc(u.submitterName || u.submitterEmail)
            : '') +
        '</div>' +
      '</div>' +
    '</div>';

    if (!versions.length) {
      rows += '<div class="tl-row">' +
        '<span class="tl-dot pending"></span>' +
        '<div class="tl-body">' +
          '<div class="tl-title">Not submitted yet</div>' +
          '<div class="tl-meta">Saved as a draft — last edit ' + fmtDateTime(u.lastUpdated) + '.</div>' +
        '</div>' +
      '</div>';
    } else {
      rows += versions.map(function (v) {
        var isFirst = v.version === 1;
        return '<div class="tl-row' + (v.current ? ' current' : '') + '">' +
          '<span class="tl-dot' + (v.current ? ' current' : '') + '"></span>' +
          '<div class="tl-body">' +
            '<div class="tl-title">Version ' + v.version +
              (isFirst ? ' <span class="tl-tag">first submission</span>' : ' <span class="tl-tag edit">edited</span>') +
              (v.current ? ' <span class="tl-tag now">current</span>' : '') +
            '</div>' +
            '<div class="tl-meta">' + fmtDateTime(v.at) +
              ' · ' + v.entries + ' ' + (v.entries === 1 ? 'entry' : 'entries') +
              (v.by ? ' · ' + esc(v.by) : '') +
            '</div>' +
            // Re-submissions can be compared against the version before them.
            (!isFirst && window.IEAHistory
              ? '<div class="tl-actions">' +
                  IEAHistory.buttonHtml(unitId(u), v.version, 'What changed in v' + v.version) +
                '</div>'
              : '') +
          '</div>' +
        '</div>';
      }).join('');
    }

    // Per-year submission dates, where recorded
    var yearRows = cfg.years.filter(function (y) { return submittedYears[y]; })
      .map(function (y) {
        return '<div class="ty-row"><span class="ty-year">' + esc(y) + '</span>' +
          '<span class="ty-date">' + fmtDateTime(submittedYears[y]) + '</span></div>';
      }).join('');

    return '<div class="chart-card wide tl-card">' +
      '<h5>Submission history' +
        (versions.length > 1 && window.IEAHistory
          ? ' <span style="float:right;font-weight:400">' +
              IEAHistory.timelineButtonHtml(unitId(u), 'Compare versions') + '</span>'
          : '') +
      '</h5>' +
      '<div class="tl">' + rows + '</div>' +
      (yearRows
        ? '<div class="ty-block"><div class="ty-head">Submitted per academic year</div>' + yearRows + '</div>'
        : '') +
      '<div class="tl-foot">Last edit of any kind: <b>' + fmtDateTime(u.lastUpdated) + '</b>' +
        (versions.length ? ' · Currently on version <b>' + versions[versions.length - 1].version + '</b>' : '') +
      '</div>' +
    '</div>';
  }

  function renderAnalysis(u, shown) {
    var years = shown.length ? shown : cfg.years;

    // Entries per section, across the years in view
    var bySection = cfg.sections.map(function (s) {
      return {
        label: s.key + ' — ' + s.title,
        short: 'Section ' + s.key,
        value: years.reduce(function (n, y) { return n + entriesIn(u, y, s.key).length; }, 0),
        color: s.color
      };
    });
    var total = bySection.reduce(function (n, d) { return n + d.value; }, 0);

    // Entries per academic year (every tracked year, so gaps are visible)
    var byYear = cfg.years.map(function (y) {
      return { label: String(y).replace('AY ', ''), value: countForYear(u, y), color: '#0a2558' };
    });

    var filled = filledYears(u);
    var busiest = byYear.slice().sort(function (a, b) { return b.value - a.value; })[0];
    var topSection = bySection.slice().sort(function (a, b) { return b.value - a.value; })[0];

    var stats =
      '<div class="an-stats">' +
        '<div class="an-stat"><div class="an-stat-num">' + total + '</div><div class="an-stat-label">Total entries</div></div>' +
        '<div class="an-stat"><div class="an-stat-num">' + filled.length + ' / ' + cfg.years.length +
          '</div><div class="an-stat-label">Years filled</div></div>' +
        '<div class="an-stat"><div class="an-stat-num">' +
          (total ? (total / Math.max(filled.length, 1)).toFixed(1) : '0') +
          '</div><div class="an-stat-label">Avg entries per filled year</div></div>' +
        '<div class="an-stat"><div class="an-stat-num">' +
          (busiest && busiest.value ? esc(busiest.label) : '—') +
          '</div><div class="an-stat-label">Most active year</div></div>' +
      '</div>';

    var legend = '<div class="chart-legend">' + bySection.map(function (d) {
      var pct = total ? Math.round((d.value / total) * 100) : 0;
      return '<div class="lg-item' + (d.value ? '' : ' zero') + '">' +
        '<span class="lg-dot" style="background:' + d.color + '"></span>' +
        '<span class="lg-text">' + esc(d.short) + '</span>' +
        '<span class="lg-val">' + d.value + ' · ' + pct + '%</span>' +
      '</div>';
    }).join('') + '</div>';

    return stats +
      renderTimeline(u) +
      '<div class="chart-grid">' +
        '<div class="chart-card">' +
          '<h5>Entry mix by section</h5>' +
          '<div class="donut-wrap">' + donutChart(bySection, 180) + legend + '</div>' +
        '</div>' +
        '<div class="chart-card">' +
          '<h5>Entries per academic year</h5>' +
          barChart(byYear) +
        '</div>' +
        '<div class="chart-card wide">' +
          '<h5>Section totals (A–F)</h5>' +
          barChart(bySection.map(function (d) { return { label: d.short, value: d.value, color: d.color }; })) +
        '</div>' +
      '</div>' +
      (topSection && topSection.value
        ? '<div class="an-note">Strongest area: <b>' + esc(topSection.label) + '</b> with ' +
          topSection.value + ' of ' + total + ' entries.</div>'
        : '');
  }

  function renderSection(u, year, s) {
    var entries = entriesIn(u, year, s.key);
    return '<div class="iea-detail-section" style="--accent:' + s.color + '">' +
      '<h4>' + s.key + ' — ' + esc(s.title) + ' (' + entries.length + ')</h4>' +
      entries.map(function (e) {
        var evDetailHtml = '';
        if (e.evidenceDetails) {
          Object.keys(e.evidenceDetails).forEach(function (t) {
            var d = e.evidenceDetails[t];
            if (d && (d.driveLink || d.fileUrl || d.notes)) {
              evDetailHtml += '<div style="font-size:12px; background:#f8fafc; padding:6px 10px; border-radius:6px; margin-top:4px; border:1px solid #e2e8f0;">' +
                '<b>' + esc(t) + ':</b> ' +
                (d.driveLink ? '<a href="' + esc(d.driveLink) + '" target="_blank" rel="noopener">🔗 Google Drive Link</a> ' : '') +
                (d.fileUrl ? '<a href="' + esc(d.fileUrl) + '" target="_blank" rel="noopener">📁 Uploaded File (' + esc(d.fileName || 'File') + ')</a> ' : '') +
                (d.notes ? '<i>Remarks: ' + escText(d.notes) + '</i>' : '') +
              '</div>';
            }
          });
        }
        var mainDriveLink = e.evidenceLink
          ? '<a href="' + esc(e.evidenceLink) + '" target="_blank" rel="noopener">🔗 ' + esc(e.evidenceLink) + '</a>'
          : '<span class="iea-no-entries">— not provided —</span>';

        return '<div class="iea-detail-entry">' +
          s.fields.map(function (f) {
            return '<div class="df"><b>' + esc(f.l) + ':</b> ' +
              (e[f.k] ? escText(e[f.k]) : '<span class="iea-no-entries">— not filled —</span>') + '</div>';
          }).join('') +
          '<div class="df"><b>Evidence types:</b> ' +
            ((e.evidenceTypes && e.evidenceTypes.length) ? escText(e.evidenceTypes.join(', ')) : '<span class="iea-no-entries">— none selected —</span>') + '</div>' +
          '<div class="df"><b>Google Drive Link (shared with Office of Academics):</b> ' + mainDriveLink + '</div>' +
          (evDetailHtml ? '<div class="df"><b>Evidence Links &amp; Attachments:</b>' + evDetailHtml + '</div>' : '') +
          (e.evidenceMissing ? '<div class="df"><b>Evidence missing / remarks:</b> ' + escText(e.evidenceMissing) + '</div>' : '') +
        '</div>';
      }).join('') +
    '</div>';
  }

  function wireEvents(el) {
    el.querySelectorAll('[data-unit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-unit');
        expandedUnit = expandedUnit === id ? null : id;
        render();
      });
    });
    el.querySelectorAll('[data-link]').forEach(function (btn) {
      btn.addEventListener('click', function () { copyShareLink(btn.getAttribute('data-link'), btn); });
    });
    el.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteUnit(btn.getAttribute('data-del')); });
    });
    el.querySelectorAll('[data-copyschool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyText(schoolShareLink(btn.getAttribute('data-copyschool')), btn);
      });
    });
    el.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-tab').split('|');
        detailTab[parts[0]] = parts.slice(1).join('|');
        render();
      });
    });
  }

  function deleteUnit(id) {
    var u = findUnit(id);
    if (!u) return;
    if (!confirm('Delete the entire IEA submission for:\n\n' + u.school + ' — ' + u.department +
      ' (' + u.level + ')\n\nThis removes all years and cannot be undone.')) return;
    fetch('/admin/iea-delete/' + id, { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          var idx = cfg.units.indexOf(u);
          if (idx > -1) cfg.units.splice(idx, 1);
          if (expandedUnit === id) expandedUnit = null;
          render();
        } else alert(res.error || 'Delete failed');
      })
      .catch(function () { alert('Network error'); });
  }

  function notify(unitCount, entryCount) {
    if (typeof cfg.onChange === 'function') {
      cfg.onChange({
        year: yearFilter, units: unitCount, entries: entryCount,
        focus: focus, scopeYears: scopeYears()
      });
    }
  }

  /* ── Public API ───────────────────────────────────────── */
  function mount(options) {
    cfg = options || {};
    cfg.units = cfg.units || [];
    cfg.years = cfg.years || [];
    cfg.sections = cfg.sections || [];
    focus = cfg.focus || null;
    if (focus) dataFilter = 'all';   // a shared link must resolve even with zero entries
    render();
  }

  return {
    mount: mount,
    render: render,
    shareLinkFor: shareLinkFor,
    setYear: function (y) { yearFilter = y || ''; render(); },
    getYear: function () { return yearFilter; },
    setSearch: function (q) { searchTerm = q || ''; render(); },
    setDeptFilter: function (d) { deptFilter = d || ''; render(); },
    /* Cascading school → department pickers. */
    setScope: function (school, dept) {
      schoolFilter = school || '';
      deptFilter = dept || '';
      if (!deptFilter) expandedUnit = null;
      render();
    },
    /* Schools present in the data, each with its departments. */
    schoolIndex: function () {
      var map = {};
      (cfg && cfg.units ? cfg.units : []).forEach(function (u) {
        if (!map[u.school]) map[u.school] = {};
        map[u.school][u.department] = (map[u.school][u.department] || 0) + 1;
      });
      return Object.keys(map).sort().map(function (school) {
        return { school: school, departments: Object.keys(map[school]).sort() };
      });
    },
    niceName: niceName,
    /* Units the last render displayed — hosts scope their KPIs to this. */
    visibleUnits: function () { return lastVisible.slice(); },
    isScoped: function () { return !!(schoolFilter || deptFilter || focus); },
    setDataFilter: function (v) { dataFilter = v || 'with_data'; render(); },
    /* Apply several filters with a single re-render. */
    setFilters: function (o) {
      o = o || {};
      if ('search' in o) searchTerm = o.search || '';
      if ('dept' in o) deptFilter = o.dept || '';
      if ('school' in o) schoolFilter = o.school || '';
      if ('data' in o) dataFilter = o.data || 'with_data';
      if ('year' in o) yearFilter = o.year || '';
      render();
    },
    clearFocus: function () { focus = null; render(); },
    countForYear: countForYear,
    filledYears: filledYears,
    entriesIn: entriesIn
  };
})();
