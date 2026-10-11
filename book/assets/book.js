/* 科研入门指南 · 阅读器脚本 */
(function () {
  'use strict';

  /* ---------- 主题 ---------- */
  var body = document.body;
  try {
    var theme = localStorage.getItem('rs-theme');
    if (theme === 'dark' || (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      body.classList.add('dark');
    }
  } catch (e) {}
  var themeBtn = document.getElementById('theme-toggle');
  function syncThemeBtn() {
    if (!themeBtn) return;
    themeBtn.textContent = body.classList.contains('dark') ? '☀️ 浅色模式' : '🌙 深色模式';
  }
  syncThemeBtn();
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      body.classList.add('theme-init');
      body.classList.toggle('dark');
      try { localStorage.setItem('rs-theme', body.classList.contains('dark') ? 'dark' : 'light'); } catch (e) {}
      syncThemeBtn();
      setTimeout(function () { body.classList.remove('theme-init'); }, 60);
    });
  }

  /* ---------- 移动端侧栏 ---------- */
  var menuBtn = document.getElementById('menu-btn');
  var mask = document.getElementById('sidebar-mask');
  if (menuBtn) menuBtn.addEventListener('click', function () { body.classList.toggle('sidebar-open'); });
  if (mask) mask.addEventListener('click', function () { body.classList.remove('sidebar-open'); });

  /* ---------- 阅读进度 + 回到顶部 ---------- */
  var bar = document.getElementById('progress-bar');
  var backTop = document.getElementById('back-top');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    if (backTop) backTop.classList.toggle('show', h.scrollTop > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (backTop) backTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- 键盘翻页 ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { var p = document.querySelector('.pager-link.prev'); if (p) p.click(); }
    if (e.key === 'ArrowRight') { var n = document.querySelector('.pager-link.next'); if (n) n.click(); }
    if (e.key === '/') {
      var si = document.getElementById('search-input');
      if (si) { e.preventDefault(); si.focus(); }
    }
  });

  /* ---------- 全文搜索 ---------- */
  var input = document.getElementById('search-input');
  var panel = document.getElementById('search-results');
  if (input && panel && window.SEARCH_DATA) {
    var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    function snippet(text, kw) {
      var idx = text.indexOf(kw);
      if (idx === -1) idx = 0;
      var start = Math.max(0, idx - 28);
      var frag = text.slice(start, Math.min(text.length, idx + kw.length + 60));
      return esc(frag).replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '<mark>$&</mark>');
    }
    function runSearch() {
      var kw = input.value.trim();
      if (kw.length < 1) { panel.classList.remove('open'); panel.innerHTML = ''; return; }
      var html = '';
      var count = 0;
      for (var i = 0; i < SEARCH_DATA.length && count < 24; i++) {
        var ch = SEARCH_DATA[i];
        var hitTitle = ch.title.indexOf(kw) !== -1;
        var idx = ch.text.indexOf(kw);
        var headHits = [];
        for (var h = 0; h < ch.headings.length; h++) {
          if (ch.headings[h].text.indexOf(kw) !== -1) headHits.push(ch.headings[h]);
        }
        if (hitTitle || idx !== -1 || headHits.length) {
          count++;
          html += '<a class="sr-item" href="' + ch.file + '"><div class="sr-title">' + esc(ch.title) + (hitTitle ? ' <mark>' + esc(kw) + '</mark>' : '') + '</div>' +
            (idx !== -1 ? '<div class="sr-snippet">…' + snippet(ch.text, kw) + '…</div>' : '') + '</a>';
          for (var j = 0; j < headHits.length && j < 3; j++) {
            html += '<a class="sr-item sub" href="' + ch.file + '#' + headHits[j].id + '"><div class="sr-title">§ ' + esc(headHits[j].text) + '</div></a>';
          }
        }
      }
      if (!count) html = '<div class="sr-empty">没有找到“' + esc(kw) + '”相关内容</div>';
      panel.innerHTML = html;
      panel.classList.add('open');
    }
    input.addEventListener('input', runSearch);
    input.addEventListener('focus', runSearch);
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && e.target !== input) panel.classList.remove('open');
    });
    panel.addEventListener('click', function () { panel.classList.remove('open'); input.value = ''; });
  }
})();
