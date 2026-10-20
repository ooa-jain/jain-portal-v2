/* ════════════════════════════════════════════════════════════════════
   IEA version history — shared before/after viewer.

   Every re-submission stores a full snapshot, so any version can be
   compared field-by-field against the one before it. Used by the analysis
   page, the shared department link, the admin IEA dashboard and the
   read-only status share page, so it lives here rather than in any one of
   them. The modal and its styles are injected on first use.

     IEAHistory.openDiff(sid, version)   what changed in that version
     IEAHistory.openTimeline(sid)        all versions, pick one to compare
     IEAHistory.buttonHtml(sid, version) a ready-made "What changed" button
   ════════════════════════════════════════════════════════════════════ */
window.IEAHistory = (function () {
  'use strict';

  var mounted = false;

  var CSS = [
    '.ieah-ov{position:fixed;inset:0;background:rgba(10,37,88,.58);backdrop-filter:blur(3px);',
    'display:none;align-items:center;justify-content:center;padding:18px;z-index:100000;',
    "font-family:'Plus Jakarta Sans',system-ui,sans-serif}",
    '.ieah-ov.open{display:flex}',
    '.ieah-modal{background:#fff;border-radius:16px;width:100%;max-width:960px;max-height:90vh;',
    'display:flex;flex-direction:column;overflow:hidden;box-shadow:0 30px 90px rgba(0,0,0,.32)}',
    '.ieah-head{padding:16px 20px;background:linear-gradient(120deg,#0a2558,#173a80);color:#fff;',
    'display:flex;justify-content:space-between;align-items:flex-start;gap:14px}',
    '.ieah-head h3{margin:0;font-size:16.5px;font-weight:800}',
    '.ieah-head p{margin:4px 0 0;font-size:12px;color:#bccbe8;font-weight:600}',
    '.ieah-x{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;',
    'border-radius:8px;width:30px;height:30px;font-size:15px;cursor:pointer;flex-shrink:0;line-height:1}',
    '.ieah-body{padding:20px;overflow-y:auto;background:#f7f9fd}',
    '.ieah-foot{padding:12px 20px;border-top:1px solid #e3e8f2;background:#fff;display:flex;',
    'justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}',
    '.ieah-btn{border:1px solid #dde3f0;background:#fff;color:#0a2558;border-radius:8px;',
    "padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;gap:6px}",
    '.ieah-btn:hover{background:#eef2fb}',
    '.ieah-btn.primary{background:#0a2558;color:#fff;border-color:#0a2558}',
    '.ieah-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid #cfe0ff;background:#eef4ff;',
    'color:#1e40af;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:800;cursor:pointer;',
    'font-family:inherit;line-height:1.4}',
    '.ieah-chip:hover{background:#dbe7ff}',
    '.ieah-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:18px}',
    '.ieah-sum > div{background:#fff;border:1px solid #e3e8f2;border-radius:10px;padding:11px;text-align:center}',
    '.ieah-sum .n{font-size:20px;font-weight:800;line-height:1.1}',
    '.ieah-sum .l{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#7c8aa5;margin-top:3px}',
    '.ieah-sum .add .n{color:#15803d}.ieah-sum .rem .n{color:#b91c1c}',
    '.ieah-sum .mod .n{color:#b45309}.ieah-sum .fld .n{color:#0a2558}',
    '.ieah-vs{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid #e3e8f2;',
    'border-radius:10px;padding:12px 14px;margin-bottom:18px;font-size:12.5px;font-weight:600;color:#475569}',
    '.ieah-vs b{color:#0a2558}',
    '.ieah-year{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0a2558;',
    'margin:18px 0 9px;padding-bottom:6px;border-bottom:2px solid #e3e8f2}',
    '.ieah-sec{background:#fff;border:1px solid #e3e8f2;border-left-width:4px;border-radius:10px;',
    'padding:13px 15px;margin-bottom:11px}',
    '.ieah-sec h5{margin:0 0 9px;font-size:13px;font-weight:800;color:#0a2558}',
    '.ieah-ent{border:1px solid #e8edf6;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#fbfcfe}',
    '.ieah-ent.add{background:#f3fdf6;border-color:#bfe8cd}',
    '.ieah-ent.rem{background:#fff5f5;border-color:#f6cccc}',
    '.ieah-ent.mod{background:#fffaf0;border-color:#ffe2b8}',
    '.ieah-ent-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:7px}',
    '.ieah-tag{font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;',
    'border-radius:5px;padding:2px 7px;border:1px solid}',
    '.ieah-tag.add{background:#eafaef;border-color:#b6e7c6;color:#15803d}',
    '.ieah-tag.rem{background:#fee;border-color:#f9c9c9;color:#b91c1c}',
    '.ieah-tag.mod{background:#fff5e6;border-color:#ffdda6;color:#b45309}',
    '.ieah-ent-name{font-weight:800;color:#16203a;font-size:12.5px;word-break:break-word}',
    '.ieah-f{border-top:1px dashed #e3e8f2;padding-top:7px;margin-top:7px}',
    '.ieah-f:first-child{border-top:none;padding-top:0;margin-top:0}',
    '.ieah-f-l{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#7c8aa5;margin-bottom:4px}',
    '.ieah-ba{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '@media(max-width:640px){.ieah-ba{grid-template-columns:1fr}}',
    '.ieah-ba > div{border-radius:7px;padding:7px 9px;font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}',
    '.ieah-before{background:#fff1f1;border:1px solid #f6cccc;color:#7f1d1d}',
    '.ieah-after{background:#f1fbf4;border:1px solid #bfe8cd;color:#14532d}',
    '.ieah-ba .lbl{display:block;font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;opacity:.7;margin-bottom:2px}',
    '.ieah-empty{background:#fff;border:1px solid #e3e8f2;border-radius:10px;padding:34px 20px;',
    'text-align:center;color:#7c8aa5;font-size:13px;font-weight:600}',
    '.ieah-vrow{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;',
    'background:#fff;border:1px solid #e3e8f2;border-radius:10px;padding:11px 14px;margin-bottom:8px}',
    '.ieah-vrow .vt{font-weight:800;color:#0a2558;font-size:13px}',
    '.ieah-vrow .vm{font-size:11.5px;color:#7c8aa5;font-weight:600;margin-top:2px}',
    '.ieah-spin{text-align:center;padding:46px;color:#7c8aa5;font-weight:600;font-size:13px}'
  ].join('');

  function mount() {
    if (mounted) return;
    mounted = true;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.className = 'ieah-ov';
    ov.id = 'ieahOverlay';
    ov.innerHTML =
      '<div class="ieah-modal">' +
        '<div class="ieah-head">' +
          '<div><h3 id="ieahTitle">Version history</h3><p id="ieahSub"></p></div>' +
          '<button class="ieah-x" type="button" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="ieah-body" id="ieahBody"></div>' +
        '<div class="ieah-foot" id="ieahFoot"></div>' +
      '</div>';
    document.body.appendChild(ov);

    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('.ieah-x').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('open')) close();
    });
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmt(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso).substring(0, 16).replace('T', ' ');
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  function unitLine(u) {
    return [u.department, u.level, u.school].filter(Boolean).map(esc).join(' · ');
  }

  function open_() {
    mount();
    document.getElementById('ieahOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    var ov = document.getElementById('ieahOverlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  }

  function loading(title) {
    document.getElementById('ieahTitle').textContent = title;
    document.getElementById('ieahSub').textContent = '';
    document.getElementById('ieahBody').innerHTML =
      '<div class="ieah-spin">Loading…</div>';
    document.getElementById('ieahFoot').innerHTML =
      '<span></span><button class="ieah-btn" type="button" data-ieah-close="1">Close</button>';
  }

  function fail(msg) {
    document.getElementById('ieahTitle').textContent = 'Not available';
    document.getElementById('ieahBody').innerHTML =
      '<div class="ieah-empty">' + esc(msg) + '</div>';
  }

  /* ── All versions of one unit ─────────────────────────────────── */
  function openTimeline(sid) {
    if (!sid) return;
    open_();
    loading('Version history');
    fetch('/api/iea/versions/' + encodeURIComponent(sid))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Not available');
        document.getElementById('ieahTitle').textContent = 'Version history';
        document.getElementById('ieahSub').textContent =
          [res.unit.department, res.unit.level, res.unit.school].filter(Boolean).join(' · ');

        if (!res.versions.length) {
          document.getElementById('ieahBody').innerHTML =
            '<div class="ieah-empty">This department has not submitted yet, so there are no versions to compare.</div>';
          return;
        }
        document.getElementById('ieahBody').innerHTML = res.versions.slice().reverse().map(function (v) {
          return '<div class="ieah-vrow">' +
            '<div>' +
              '<div class="vt">Version ' + v.version +
                (v.version === 1 ? ' · first submission' : ' · re-submitted') +
                (v.current ? ' · current' : '') + '</div>' +
              '<div class="vm">' + esc(fmt(v.at)) + ' · ' + v.entries + ' ' +
                (v.entries === 1 ? 'entry' : 'entries') + (v.by ? ' · ' + esc(v.by) : '') + '</div>' +
            '</div>' +
            (v.version > 1
              ? '<button class="ieah-btn primary" type="button" data-ieah-diff="' +
                  esc(sid) + '" data-ieah-version="' + v.version + '">See what changed</button>'
              : '<span class="vm">Nothing to compare against</span>') +
          '</div>';
        }).join('');
      })
      .catch(function (e) { fail(e.message); });
  }

  /* ── Before / after for one version ───────────────────────────── */
  function openDiff(sid, version) {
    if (!sid || !version) return;
    open_();
    loading('What changed');
    fetch('/api/iea/diff/' + encodeURIComponent(sid) + '/' + encodeURIComponent(version))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Not available');
        renderDiff(sid, res);
      })
      .catch(function (e) { fail(e.message); });
  }

  function renderDiff(sid, res) {
    document.getElementById('ieahTitle').textContent =
      'What changed in version ' + res.version;
    document.getElementById('ieahSub').textContent = unitLine(res.unit).replace(/&amp;/g, '&');

    var body = document.getElementById('ieahBody');

    if (res.isFirst) {
      body.innerHTML = '<div class="ieah-empty">Version 1 is the first submission for this ' +
        'department — there is no earlier version to compare it against.</div>';
      setFoot(sid, res);
      return;
    }

    var s = res.diff.summary;
    var html =
      '<div class="ieah-vs">' +
        '<span>Comparing <b>version ' + res.before.version + '</b> (' + esc(fmt(res.before.at)) + ')</span>' +
        '<span>&rarr;</span>' +
        '<span><b>version ' + res.after.version + '</b> (' + esc(fmt(res.after.at)) + ')</span>' +
        (res.after.by ? '<span>· edited by <b>' + esc(res.after.by) + '</b></span>' : '') +
      '</div>' +
      '<div class="ieah-sum">' +
        '<div class="add"><div class="n">' + s.added + '</div><div class="l">Entries added</div></div>' +
        '<div class="rem"><div class="n">' + s.removed + '</div><div class="l">Entries removed</div></div>' +
        '<div class="mod"><div class="n">' + s.modified + '</div><div class="l">Entries edited</div></div>' +
        '<div class="fld"><div class="n">' + s.fields + '</div><div class="l">Fields changed</div></div>' +
      '</div>';

    if (!res.diff.years.length) {
      html += '<div class="ieah-empty">This version was re-submitted without any change to the ' +
        'recorded entries.</div>';
      body.innerHTML = html;
      setFoot(sid, res);
      return;
    }

    html += res.diff.years.map(function (y) {
      return '<div class="ieah-year">' + esc(y.year) + '</div>' +
        y.sections.map(function (sec) {
          var inner = '';
          inner += sec.added.map(function (e) { return entryBlock(e, 'add', 'Added'); }).join('');
          inner += sec.removed.map(function (e) { return entryBlock(e, 'rem', 'Removed'); }).join('');
          inner += sec.modified.map(function (m) {
            return '<div class="ieah-ent mod">' +
              '<div class="ieah-ent-head"><span class="ieah-tag mod">Edited</span>' +
                '<span class="ieah-ent-name">' + esc(m.label || m.beforeLabel || '') + '</span></div>' +
              m.fields.map(function (f) {
                return '<div class="ieah-f">' +
                  '<div class="ieah-f-l">' + esc(f.l) + '</div>' +
                  '<div class="ieah-ba">' +
                    '<div class="ieah-before"><span class="lbl">Before</span>' +
                      (f.before ? esc(f.before) : '—') + '</div>' +
                    '<div class="ieah-after"><span class="lbl">After</span>' +
                      (f.after ? esc(f.after) : '—') + '</div>' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>';
          }).join('');

          return '<div class="ieah-sec" style="border-left-color:' + esc(sec.color) + '">' +
            '<h5>' + esc(sec.key) + '. ' + esc(sec.title) + '</h5>' + inner + '</div>';
        }).join('');
    }).join('');

    body.innerHTML = html;
    setFoot(sid, res);
  }

  function entryBlock(e, cls, tag) {
    return '<div class="ieah-ent ' + cls + '">' +
      '<div class="ieah-ent-head"><span class="ieah-tag ' + cls + '">' + tag + '</span>' +
        '<span class="ieah-ent-name">' + esc(e.label) + '</span></div>' +
      (e.fields.length
        ? e.fields.map(function (f) {
            return '<div class="ieah-f"><div class="ieah-f-l">' + esc(f.l) + '</div>' +
              '<div style="font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word">' +
              esc(f.v) + '</div></div>';
          }).join('')
        : '<div class="ieah-f-l">No field values recorded</div>') +
    '</div>';
  }

  function setFoot(sid, res) {
    document.getElementById('ieahFoot').innerHTML =
      '<button class="ieah-btn" type="button" data-ieah-timeline="' + esc(sid) +
        '">&larr; All versions</button>' +
      '<button class="ieah-btn primary" type="button" data-ieah-close="1">Close</button>';
  }

  /* ── Ready-made buttons for calling pages ─────────────────────── */
  function buttonHtml(sid, version, label) {
    if (!sid || !version || version < 2) return '';
    return '<button class="ieah-chip" type="button" data-ieah-diff="' + esc(sid) +
      '" data-ieah-version="' + Number(version) + '">' +
      '&#9998; ' + esc(label || 'What changed') + '</button>';
  }

  function timelineButtonHtml(sid, label) {
    if (!sid) return '';
    return '<button class="ieah-chip" type="button" data-ieah-timeline="' + esc(sid) + '">' +
      '&#128337; ' + esc(label || 'History') + '</button>';
  }

  // Delegated, so markup only ever carries data attributes. Inline onclick
  // handlers would have to round-trip the id through an HTML attribute and a
  // JS string literal, which is exactly where quoting goes wrong.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-ieah-diff],[data-ieah-timeline],[data-ieah-close]') : null;
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    if (t.hasAttribute('data-ieah-close')) close();
    else if (t.hasAttribute('data-ieah-diff')) {
      openDiff(t.getAttribute('data-ieah-diff'), parseInt(t.getAttribute('data-ieah-version'), 10));
    } else {
      openTimeline(t.getAttribute('data-ieah-timeline'));
    }
  });

  // Mount up front, not on first open: pages render .ieah-chip buttons
  // server-side, and those need the stylesheet before anyone clicks.
  if (document.body) {
    mount();
  } else {
    document.addEventListener('DOMContentLoaded', mount);
  }

  return {
    openDiff: openDiff,
    openTimeline: openTimeline,
    buttonHtml: buttonHtml,
    timelineButtonHtml: timelineButtonHtml,
    close: close
  };
})();
