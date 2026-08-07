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
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  };

  var cfg = null;
  var yearFilter = '';        // '' = every academic year
  var searchTerm = '';
  var deptFilter = '';        // exact school or department name, '' = all
  var dataFilter = 'with_data';
  var expandedUnit = null;
  var focus = null;           // {school, department, level} when opened via share link

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

  function copyShareLink(id, btn) {
    var u = findUnit(id);
    if (!u) return;
    var link = shareLinkFor(u);
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
    return focus &&
      u.school === focus.school &&
      u.department === focus.department &&
      u.level === focus.level;
  }

  /* ── Render ───────────────────────────────────────────── */
  function render() {
    var el = document.getElementById(cfg.mountId);
    if (!el) return;

    if (!cfg.units.length) {
      el.innerHTML = '<div class="iea-empty-state">' + ICON.folder +
        '<h3>No submissions yet</h3><p>Once departments save data, they will appear here as cards.</p></div>';
      notify(0, 0);
      return;
    }

    var scope = scopeYears();
    var q = searchTerm.trim().toLowerCase();

    var visible = cfg.units.filter(function (u) {
      if (focus) return matchesFocus(u);
      if (deptFilter && u.department !== deptFilter && u.school !== deptFilter) return false;
      var haystack = [u.school, u.department, u.level, u.submitterName, u.submitterEmail].join(' ').toLowerCase();
      if (q && haystack.indexOf(q) === -1) return false;
      if (dataFilter === 'all') return true;
      var has = scope.some(function (y) { return countForYear(u, y) > 0; });
      return dataFilter === 'draft' ? !has : has;
    });

    var banner = '';
    if (focus) {
      var f = visible[0];
      banner = '<div class="focus-banner">' +
        '<div>' +
          '<div class="fb-eyebrow">' + esc(focus.school) + '</div>' +
          '<div class="fb-title">' + esc(focus.department) + ' · ' + esc(focus.level) + '</div>' +
          '<div class="fb-sub">' + (f
            ? 'Showing this department\'s Innovation &amp; Emerging Areas analysis across all academic years.'
            : 'No submission has been recorded for this department yet.') + '</div>' +
        '</div>' +
        '<a href="' + location.pathname + '">View all departments →</a>' +
      '</div>';
    }

    if (!visible.length) {
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
          '<h2>' + esc(school) + '</h2>' +
          '<span class="school-meta">' + reporting + ' of ' + units.length + ' departments reporting · ' +
            schoolEntries + ' ' + (schoolEntries === 1 ? 'entry' : 'entries') +
            (yearFilter ? ' in ' + esc(yearFilter) : ' across all years') + '</span>' +
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
      (cfg.canExport
        ? '<a class="card-btn" href="/admin/iea-export?sid=' + unitId(u) + '" title="Excel — one tab per year">' + ICON.download + ' Excel</a>'
        : '') +
      (cfg.canDelete
        ? '<button class="card-btn danger" data-del="' + unitId(u) + '">' + ICON.trash + '</button>'
        : '');

    var card =
      '<div class="dept-card' + (isOpen ? ' is-open' : '') + (hasData ? '' : ' no-data') + '">' +
        '<div class="dc-school">' + esc(u.school) + '</div>' +
        '<div class="dc-top">' +
          '<div class="dc-name">' + esc(u.department) + '</div>' +
          '<span class="level-badge">' + esc(u.level) + '</span>' +
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

  function renderUnitDetail(u) {
    var filled = filledYears(u);
    var shown = yearFilter ? filled.filter(function (y) { return y === yearFilter; }) : filled;

    var head =
      '<div class="detail-panel-head">' +
        '<div>' +
          '<div class="dp-school">' + esc(u.school) + '</div>' +
          '<h3>' + esc(u.department) + ' · ' + esc(u.level) + '</h3>' +
          '<div class="dp-sub">Showing ' + shown.length + ' ' + (shown.length === 1 ? 'year' : 'years') +
            ' with entries, out of ' + cfg.years.length + ' tracked.</div>' +
        '</div>' +
        (cfg.canExport
          ? '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
              '<a class="card-btn" href="/admin/iea-export?sid=' + unitId(u) + '">' + ICON.download + ' All years (.xlsx)</a>' +
            '</div>'
          : '') +
      '</div>' +
      '<div class="share-note"><b>Share link for this department:</b> ' + esc(shareLinkFor(u)) +
        (u.submitterEmail ? '<br><b>Filled by:</b> ' + esc(u.submitterEmail) : '') + '</div>';

    if (!shown.length) {
      return '<div class="detail-panel">' + head +
        '<div class="year-empty" style="margin-top:12px;">This department has not filled any entries' +
        (yearFilter ? ' for ' + esc(yearFilter) : ' yet') + '.</div></div>';
    }

    var blocks = shown.map(function (y) {
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
            (cfg.canExport
              ? ' · <a href="/admin/iea-export?sid=' + unitId(u) + '&year=' + encodeURIComponent(y) + '" style="color:#2563eb;">Excel</a>'
              : '') +
          '</span>' +
        '</div>' +
        '<div class="year-block-body">' + body + '</div>' +
      '</div>';
    }).join('');

    return '<div class="detail-panel">' + head + '<div style="margin-top:14px;">' + blocks + '</div></div>';
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
                (d.notes ? '<i>Remarks: ' + esc(d.notes) + '</i>' : '') +
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
              (e[f.k] ? esc(e[f.k]) : '<span class="iea-no-entries">— not filled —</span>') + '</div>';
          }).join('') +
          '<div class="df"><b>Evidence types:</b> ' +
            ((e.evidenceTypes && e.evidenceTypes.length) ? esc(e.evidenceTypes.join(', ')) : '<span class="iea-no-entries">— none selected —</span>') + '</div>' +
          '<div class="df"><b>Google Drive Link (shared with Office of Academics):</b> ' + mainDriveLink + '</div>' +
          (evDetailHtml ? '<div class="df"><b>Evidence Links &amp; Attachments:</b>' + evDetailHtml + '</div>' : '') +
          (e.evidenceMissing ? '<div class="df"><b>Evidence missing / remarks:</b> ' + esc(e.evidenceMissing) + '</div>' : '') +
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
    setDataFilter: function (v) { dataFilter = v || 'with_data'; render(); },
    /* Apply several filters with a single re-render. */
    setFilters: function (o) {
      o = o || {};
      if ('search' in o) searchTerm = o.search || '';
      if ('dept' in o) deptFilter = o.dept || '';
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
