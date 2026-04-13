import { OpenAPIHono } from "@hono/zod-openapi"
import { html } from "hono/html"

const app = new OpenAPIHono()

app.get("/", (c) => {
  return c.html(html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ETHGlossary</title>
  <meta name="description" content="Ethereum terminology glossary -- English style guide and translations for 24 languages." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-1: #121214;
      --bg-2: #1a1a1e;
      --bg-3: #242428;
      --bg-hover: #2a2a30;
      --text-1: rgba(255,255,245,.86);
      --text-2: rgba(255,255,245,.6);
      --text-3: rgba(255,255,245,.38);
      --accent: #8b7cf6;
      --accent-dim: rgba(139,124,246,.15);
      --warn: #f59e0b;
      --warn-dim: rgba(245,158,11,.12);
      --border: rgba(255,255,255,.08);
      --radius: 8px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --mono: ui-monospace, "SF Mono", Menlo, monospace;
    }

    body {
      font-family: var(--font);
      background: var(--bg-1);
      color: var(--text-1);
      line-height: 1.5;
      min-height: 100vh;
    }

    /* Layout */
    .app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

    header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    header h1 { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
    header h1 span { color: var(--accent); }

    .header-links { display: flex; gap: 12px; font-size: 13px; }
    .header-links a { color: var(--text-3); text-decoration: none; }
    .header-links a:hover { color: var(--text-1); }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      flex-shrink: 0;
    }

    .tab {
      padding: 10px 16px;
      font-size: 14px;
      color: var(--text-3);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all .15s;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      font-family: var(--font);
    }

    .tab:hover { color: var(--text-2); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    .content { display: flex; flex: 1; overflow: hidden; min-height: 0; }

    /* Sidebar */
    .sidebar {
      width: 320px;
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      overflow: hidden;
    }

    .search-box {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
    }

    .search-box input {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-1);
      font-size: 14px;
      font-family: var(--font);
      outline: none;
    }

    .search-box input:focus { border-color: var(--accent); }
    .search-box input::placeholder { color: var(--text-3); }

    .filters {
      padding: 8px 16px;
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-chip {
      padding: 3px 10px;
      font-size: 12px;
      border-radius: 12px;
      background: var(--bg-3);
      color: var(--text-3);
      cursor: pointer;
      border: 1px solid transparent;
      font-family: var(--font);
      transition: all .15s;
    }

    .filter-chip:hover { color: var(--text-2); border-color: var(--border); }
    .filter-chip.active { background: var(--accent-dim); color: var(--accent); border-color: var(--accent); }

    .term-list {
      flex: 1;
      overflow-y: auto;
      padding: 4px 0;
    }

    .term-item {
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-2);
      transition: background .1s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .term-item:hover { background: var(--bg-hover); }
    .term-item.active { background: var(--accent-dim); color: var(--accent); }
    .term-item .cat { font-size: 11px; color: var(--text-3); }

    .term-count {
      padding: 8px 16px;
      font-size: 12px;
      color: var(--text-3);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .view-all-btn {
      background: none;
      border: none;
      color: var(--accent);
      font-size: 12px;
      cursor: pointer;
      font-family: var(--font);
      padding: 0;
    }

    .view-all-btn:hover { text-decoration: underline; }

    .view-all-row { color: var(--accent) !important; font-weight: 500; border-bottom: 1px solid var(--border); }

    .overview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .overview-table th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 2px solid var(--border);
      color: var(--text-3);
      font-weight: 500;
      font-size: 12px;
      position: sticky;
      top: 0;
      background: var(--bg-2);
    }

    .overview-table td {
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-2);
      vertical-align: top;
    }

    .overview-table tr { cursor: pointer; }
    .overview-table tr:hover td { background: var(--bg-hover); }

    .overview-table .term-col { color: var(--text-1); font-weight: 500; }
    .overview-table .avoid-col { color: var(--warn); font-size: 12px; }
    .overview-table .note-col { font-size: 12px; color: var(--text-3); max-width: 300px; }

    /* Detail panel */
    .detail {
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px;
    }

    .detail-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--text-3);
      font-size: 14px;
    }

    .detail h2 { font-size: 24px; font-weight: 600; margin-bottom: 4px; }
    .detail .meta { color: var(--text-3); font-size: 13px; margin-bottom: 20px; }
    .detail .meta span { margin-right: 12px; }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 11px;
      border-radius: 4px;
      font-weight: 500;
    }

    .badge-category { background: var(--accent-dim); color: var(--accent); }
    .badge-casing { background: var(--bg-3); color: var(--text-2); }

    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: var(--text-3);
      margin-bottom: 8px;
    }

    .definition { color: var(--text-2); font-size: 14px; line-height: 1.6; }
    .definition a { color: var(--accent); }

    .avoid-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .avoid-tag {
      padding: 3px 10px;
      font-size: 13px;
      font-family: var(--mono);
      background: var(--warn-dim);
      color: var(--warn);
      border-radius: 4px;
      text-decoration: line-through;
    }

    .alias-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .alias-tag {
      padding: 3px 10px;
      font-size: 13px;
      font-family: var(--mono);
      background: var(--bg-3);
      color: var(--text-2);
      border-radius: 4px;
    }
    .alias-tag .status { color: var(--text-3); font-size: 11px; margin-left: 4px; }

    .note-text {
      padding: 12px 16px;
      background: var(--bg-3);
      border-radius: var(--radius);
      font-size: 13px;
      color: var(--text-2);
      border-left: 3px solid var(--accent);
    }

    /* Translation table */
    .translation-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .translation-table th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-3);
      font-weight: 500;
      font-size: 12px;
    }

    .translation-table td {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border);
      color: var(--text-2);
    }

    .translation-table tr:hover td { background: var(--bg-hover); }

    /* Language selector */
    .lang-select {
      padding: 8px 12px;
      background: var(--bg-3);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text-1);
      font-size: 14px;
      font-family: var(--font);
      cursor: pointer;
      outline: none;
    }

    .lang-bar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .lang-bar label { font-size: 13px; color: var(--text-3); }

    .confidence { font-size: 11px; padding: 1px 6px; border-radius: 3px; }
    .confidence-high { background: rgba(52,211,153,.15); color: #34d399; }
    .confidence-medium { background: rgba(251,191,36,.15); color: #fbbf24; }
    .confidence-low { background: rgba(248,113,113,.15); color: #f87171; }

    /* Loading */
    .loading { color: var(--text-3); font-size: 14px; padding: 20px; text-align: center; }

    /* Mobile */
    @media (max-width: 768px) {
      .content { flex-direction: column; }
      .sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border); max-height: 45vh; }
      .detail { padding: 16px; }
      header { padding: 12px 16px; }
      .tabs { padding: 0 16px; }
      .search-box { padding: 8px 12px; }
      .filters { padding: 6px 12px; flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .filter-chip { white-space: nowrap; flex-shrink: 0; }
      .term-item { padding: 8px 12px; }
    }
  </style>
</head>
<body>
  <div class="app">
    <header>
      <h1><span>ETH</span>Glossary<sup style="font-size:10px;color:var(--text-3);margin-left:4px;font-weight:400">beta</sup></h1>
      <div class="header-links">
        <a href="/docs">API Docs</a>
        <a href="/openapi.json">OpenAPI Spec</a>
        <a href="/llms.txt">llms.txt</a>
      </div>
    </header>

    <div class="tabs">
      <button class="tab active" data-tab="style-guide">Style Guide</button>
      <button class="tab" data-tab="translations">Translations</button>
    </div>

    <div id="translations-bar" class="lang-bar" style="display:none">
      <label for="lang-picker">Language:</label>
      <select id="lang-picker" class="lang-select"></select>
    </div>

    <div class="content">
      <div class="sidebar">
        <div class="search-box">
          <input type="text" id="search" placeholder="Search terms..." autocomplete="off" />
        </div>
        <div class="term-list" id="term-list">
          <div class="filters" id="filters"></div>
          <div class="loading">Loading...</div>
        </div>
        <div class="term-count" id="term-count"></div>
      </div>
      <div class="detail" id="detail">
        <div class="detail-empty">Select a term to view details</div>
      </div>
    </div>
  </div>

  <script>
    const API = '/api/v1';
    let allTerms = [];
    let categories = new Set();
    let activeCategory = null;
    let activeTab = 'style-guide';
    let activeLang = 'es';
    let translations = {};
    let languages = [];

    // Fetch style guide data
    async function loadStyleGuide() {
      const res = await fetch(API + '/style-guide');
      const data = await res.json();
      allTerms = data.terms;
      categories = new Set(allTerms.map(t => t.category));
      renderTermList();
      renderOverview();
    }

    // Fetch languages
    async function loadLanguages() {
      const res = await fetch(API + '/languages');
      const data = await res.json();
      languages = data.languages;
      const picker = document.getElementById('lang-picker');
      picker.innerHTML = languages.map(l =>
        '<option value="' + l.code + '"' + (l.code === activeLang ? ' selected' : '') + '>' +
        l.name + ' (' + l.code + ')</option>'
      ).join('');
    }

    // Fetch translations for a language
    async function loadTranslations(lang) {
      const res = await fetch(API + '/translations/' + lang);
      const data = await res.json();
      translations = data.terms;
      renderTermList();
    }

    function renderFilters() {
      const el = document.getElementById('filters');
      const cats = Array.from(categories).sort();
      el.innerHTML = cats.map(c =>
        '<button class="filter-chip' + (activeCategory === c ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>'
      ).join('');
    }

    function getFilteredTerms() {
      let terms = allTerms;
      const q = document.getElementById('search').value.toLowerCase();
      if (q) {
        terms = terms.filter(t =>
          t.term.toLowerCase().includes(q) ||
          (t.definition || '').toLowerCase().includes(q) ||
          (t.aliases || []).some(a => (a.term || '').toLowerCase().includes(q)) ||
          (t.avoid || []).some(a => a.toLowerCase().includes(q))
        );
      }
      if (activeCategory) {
        terms = terms.filter(t => t.category === activeCategory);
      }
      return terms;
    }

    function renderTermList() {
      const terms = getFilteredTerms();
      const el = document.getElementById('term-list');
      const filtersHtml = '<div class="filters" id="filters">' +
        Array.from(categories).sort().map(c =>
          '<button class="filter-chip' + (activeCategory === c ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>'
        ).join('') + '</div>';
      el.innerHTML = filtersHtml +
        '<div class="term-item view-all-row" id="view-all-top"><span>View all terms</span><span class="cat">' + terms.length + '</span></div>' +
        terms.map(t =>
        '<div class="term-item" data-id="' + t.id + '">' +
        '<span>' + escHtml(t.term) + '</span>' +
        '<span class="cat">' + t.category + '</span>' +
        '</div>'
      ).join('');
      document.getElementById('term-count').innerHTML =
        '<span>' + terms.length + ' terms</span><button class="view-all-btn" id="view-all-btn">View all</button>';
    }

    function renderDetail(term) {
      const el = document.getElementById('detail');
      let html = '<h2>' + escHtml(term.term) + '</h2>';
      html += '<div class="meta">';
      html += '<span class="badge badge-category">' + term.category + '</span> ';
      html += '<span class="badge badge-casing">' + term.casing + '</span> ';
      if (term.scriptRule && term.scriptRule !== 'translate') {
        html += '<span class="badge badge-casing">' + term.scriptRule + '</span>';
      }
      html += '</div>';

      if (term.definition) {
        html += '<div class="section"><div class="section-title">Definition</div>';
        html += '<div class="definition">' + term.definition + '</div></div>';
      }

      if (term.avoid && term.avoid.length) {
        html += '<div class="section"><div class="section-title">Avoid</div>';
        html += '<div class="avoid-list">' + term.avoid.map(a => '<span class="avoid-tag">' + escHtml(a) + '</span>').join('') + '</div></div>';
      }

      if (term.aliases && term.aliases.length) {
        html += '<div class="section"><div class="section-title">Aliases</div>';
        html += '<div class="alias-list">' + term.aliases.map(a =>
          '<span class="alias-tag">' + escHtml(a.term) + '<span class="status">' + a.status + '</span></span>'
        ).join('') + '</div></div>';
      }

      if (term.note) {
        html += '<div class="section"><div class="section-title">Note</div>';
        html += '<div class="note-text">' + escHtml(term.note) + '</div></div>';
      }

      // Show translations if on translations tab
      if (activeTab === 'translations') {
        const tr = translations[term.id] || translations[term.term.toLowerCase()] || translations[term.term];
        if (tr) {
          html += '<div class="section"><div class="section-title">Translation (' + activeLang + ')</div>';
          html += '<table class="translation-table">';
          html += '<tr><th>Context</th><th>Form</th></tr>';
          if (tr.contexts) {
            for (const [ctx, val] of Object.entries(tr.contexts)) {
              if (val && val.term) {
                html += '<tr><td>' + ctx + '</td><td>' + escHtml(val.term) + '</td></tr>';
              }
            }
          }
          if (tr.plurals) {
            html += '<tr><th colspan="2" style="padding-top:12px">Plurals</th></tr>';
            for (const [form, val] of Object.entries(tr.plurals)) {
              if (val) html += '<tr><td>' + form + '</td><td>' + escHtml(val) + '</td></tr>';
            }
          }
          html += '</table>';
          if (tr.confidence) {
            html += '<div style="margin-top:8px"><span class="confidence confidence-' + tr.confidence + '">' + tr.confidence + '</span></div>';
          }
          html += '</div>';
        }
      }

      el.innerHTML = html;
    }

    function escHtml(s) {
      if (!s) return '';
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function renderOverview() {
      const terms = getFilteredTerms();
      const el = document.getElementById('detail');
      document.querySelectorAll('.term-item.active').forEach(e => e.classList.remove('active'));

      let html = '<table class="overview-table"><thead><tr>';
      if (activeTab === 'style-guide') {
        html += '<th>Term</th><th>Category</th><th>Casing</th><th>Avoid</th><th>Note</th>';
      } else {
        html += '<th>Term</th><th>Translation</th><th>Category</th>';
      }
      html += '</tr></thead><tbody>';

      for (const t of terms) {
        if (activeTab === 'style-guide') {
          const avoids = (t.avoid || []).slice(0, 3).map(a => escHtml(a)).join(', ');
          const note = t.note ? escHtml(t.note).substring(0, 80) + (t.note.length > 80 ? '...' : '') : '';
          html += '<tr data-id="' + t.id + '">' +
            '<td class="term-col">' + escHtml(t.term) + '</td>' +
            '<td><span class="badge badge-category">' + t.category + '</span></td>' +
            '<td>' + t.casing + '</td>' +
            '<td class="avoid-col">' + avoids + '</td>' +
            '<td class="note-col">' + note + '</td></tr>';
        } else {
          const tr = translations[t.id] || translations[t.term.toLowerCase()] || translations[t.term];
          const translated = tr ? escHtml(tr.term) : '<span style="color:var(--text-3)">--</span>';
          html += '<tr data-id="' + t.id + '">' +
            '<td class="term-col">' + escHtml(t.term) + '</td>' +
            '<td>' + translated + '</td>' +
            '<td><span class="badge badge-category">' + t.category + '</span></td></tr>';
        }
      }

      html += '</tbody></table>';
      el.innerHTML = html;
    }

    // Event: view all
    document.getElementById('term-count').addEventListener('click', (e) => {
      if (e.target.closest('.view-all-btn')) renderOverview();
    });

    // Event: overview row click -> detail
    document.getElementById('detail').addEventListener('click', (e) => {
      const row = e.target.closest('.overview-table tr[data-id]');
      if (!row) return;
      const term = allTerms.find(t => t.id === row.dataset.id);
      if (term) {
        // Highlight in sidebar
        document.querySelectorAll('.term-item.active').forEach(el => el.classList.remove('active'));
        const sidebarItem = document.querySelector('.term-item[data-id="' + term.id + '"]');
        if (sidebarItem) { sidebarItem.classList.add('active'); sidebarItem.scrollIntoView({ block: 'nearest' }); }
        renderDetail(term);
      }
    });

    // Event: search
    document.getElementById('search').addEventListener('input', renderTermList);

    // Event: filter chips (delegated to term-list since filters are inside it)
    document.getElementById('term-list').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      const cat = chip.dataset.cat;
      activeCategory = activeCategory === cat ? null : cat;
      renderTermList();
    });

    // Event: term selection
    document.getElementById('term-list').addEventListener('click', (e) => {
      // View all
      if (e.target.closest('.view-all-row')) { renderOverview(); return; }
      const item = e.target.closest('.term-item');
      if (!item || !item.dataset.id) return;
      document.querySelectorAll('.term-item.active').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      const term = allTerms.find(t => t.id === item.dataset.id);
      if (term) renderDetail(term);
    });

    // Event: tab switch
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTab = tab.dataset.tab;
        document.getElementById('translations-bar').style.display =
          activeTab === 'translations' ? 'flex' : 'none';
        if (activeTab === 'translations' && !Object.keys(translations).length) {
          loadTranslations(activeLang);
        }
        // Re-render detail if a term is selected
        const activeTerm = document.querySelector('.term-item.active');
        if (activeTerm) {
          const term = allTerms.find(t => t.id === activeTerm.dataset.id);
          if (term) renderDetail(term);
        }
      });
    });

    // Event: language change
    document.getElementById('lang-picker').addEventListener('change', (e) => {
      activeLang = e.target.value;
      loadTranslations(activeLang);
      // Re-render detail if a term is selected
      setTimeout(() => {
        const activeTerm = document.querySelector('.term-item.active');
        if (activeTerm) {
          const term = allTerms.find(t => t.id === activeTerm.dataset.id);
          if (term) renderDetail(term);
        }
      }, 500);
    });

    // Init
    loadStyleGuide();
    loadLanguages();
  </script>
</body>
</html>`)
})

export default app
