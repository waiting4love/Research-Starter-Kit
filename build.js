// 电子书生成器：将 raw/*.json（飞书文档块数据）转换为静态 HTML 书籍
'use strict';
const fs = require('fs');
const path = require('path');

const RAW = path.join(__dirname, 'raw');
const OUT = path.join(__dirname, 'book');

// ---------- 章节配置 ----------
const CHAPTERS = [
  { doc: 'doc01', ch: 'ch01', token: 'LfR9woW57iWpQWkRKJhcoFF7ndb', host: 'dy8q0bnq8y', group: 0, title: '如何做科研？' },
  { doc: 'doc02', ch: 'ch02', token: 'Co5awLsRiiuYAlkqHhCcwGBanub', host: 'dy8q0bnq8y', group: 0, title: '如何找论文？' },
  { doc: 'doc03', ch: 'ch03', token: 'Ow8fw2HtEiixDgkWlkbckdvHnef', host: 'dy8q0bnq8y', group: 0, title: '如何读论文？' },
  { doc: 'doc04', ch: 'ch04', token: 'MxYVwN0lEiv5HUkLEJccRJI3nTd', host: 'dy8q0bnq8y', group: 0, title: '如何想 Idea？' },
  { doc: 'doc05', ch: 'ch05', token: 'Wr0lwNhUdiMpt1kK6UmcgnWEnJI', host: 'dy8q0bnq8y', group: 0, title: '如何进行学术汇报' },
  { doc: 'doc06', ch: 'ch06', token: 'B8FBwaHe6ivi2skemtFc3lWbnmh', host: 'dy8q0bnq8y', group: 0, title: '如何高效 Meeting' },
  { doc: 'doc07', ch: 'ch07', token: 'Bp2AwrSnAiGaH2khJaqczVXznwc', host: 'dy8q0bnq8y', group: 0, title: '一些好的习惯' },
  { doc: 'doc08', ch: 'ch08', token: 'NsK3wnWeiivKNukNJOqcd985nTY', host: 'dy8q0bnq8y', group: 1, title: '如何写论文？' },
  { doc: 'doc09', ch: 'ch09', token: 'OGpcw6zaRiQ6OwkNxfYcl7IKnBh', host: 'dy8q0bnq8y', group: 1, title: '论文画图指南' },
  { doc: 'doc10', ch: 'ch10', token: 'Tz2pwvxTyiBK0zkCVszcZmJ3nwd', host: 'dy8q0bnq8y', group: 1, title: '如何写论文：Abstract' },
  { doc: 'doc11', ch: 'ch11', token: 'ULATwBu2MiLqqRkXxV6c2S7AnPd', host: 'dy8q0bnq8y', group: 1, title: '如何写论文：Introduction' },
  { doc: 'doc12', ch: 'ch12', token: 'CLSAwWm6qifjwQkTd82czgMNnYf', host: 'dy8q0bnq8y', group: 1, title: '如何写论文：Related Works' },
  { doc: 'doc13', ch: 'ch13', token: 'CtiAwh1eOiqOfCkPKVLc0WsxnZg', host: 'dy8q0bnq8y', group: 1, title: '如何写论文：Methods' },
  { doc: 'doc14', ch: 'ch14', token: 'KHgSw2MkrikxlskGe5qclkdbn2c', host: 'dy8q0bnq8y', group: 1, title: '如何写论文：Experiments' },
  { doc: 'doc15', ch: 'ch15', token: 'A4q2wSnmRi91rykHke1cQIhnnAh', host: 'dy8q0bnq8y', group: 1, title: '如何写论文：Reference' },
  { doc: 'doc16', ch: 'ch16', token: 'M9d1wv5Efi2aG4kH4IDc5zqVnQh', host: 'dy8q0bnq8y', group: 1, title: '如何 Rebuttal' },
  { doc: 'doc17', ch: 'ch17', token: 'HDYdwMgrki0C35kR147cquf2nph', host: 'dy8q0bnq8y', group: 2, title: '学术会议参会指南' },
  { doc: 'doc18', ch: 'ch18', token: 'SN0Dw5gvhidkMtkcmAYcXbUhnSh', host: 'dy8q0bnq8y', group: 2, title: '有哪些能申请的奖学金？' },
  { doc: 'doc19', ch: 'ch19', token: 'Uf9fwnQFxiJS1akJZkPc87gFniq', host: 'lamda3-nju', group: 2, title: 'AI 辅助科研的一些 Tips' },
];
const GROUPS = [
  { name: '第一部分 · 如何做科研', short: '做科研' },
  { name: '第二部分 · 如何写论文', short: '写论文' },
  { name: '第三部分 · 杂项', short: '杂项' },
];

// 容器结构（grid 列/子块、quote 子块），来自对实时 DOM 的核查
const STRUCTURE = {
  doc01: { callouts: { 32: [33, 34], 42: [70] } },
  doc06: { grids: { 33: { cols: [['34', ['35']], ['36', ['37']]] } }, quotes: {} },
  doc09: {
    grids: {
      36: { cols: [['37', ['38']], ['39', ['40']]] },
      125: { cols: [['156', ['157']], ['158', ['159']]] },
      126: { cols: [['160', ['161']], ['162', ['163']]] },
      151: { cols: [['152', ['153']], ['154', ['155']]] },
    },
    quotes: { 21: ['22'], 91: ['150'], 147: ['164', '165', '166'] },
    callouts: { 3: [4, 5, 6, 7, 8], 45: [149] },
  },
  doc11: { callouts: { 2: [3, 4, 5, 6, 7, 8, 9] } },
  doc12: { callouts: { 2: [3, 4, 5, 6, 7, 8, 9, 10] } },
  doc13: { quotes: { 46: ['88'], 49: ['89'], 51: ['90'] }, callouts: { 2: [3, 4, 5, 6, 7, 8, 9, 10] } },
  doc14: { quotes: { 35: ['36'], 48: ['78'], 62: ['79'] } },
  doc15: { quotes: { 8: ['9'], 13: ['14', '15', '16', '17', '18', '19', '20'] }, callouts: { 3: [4] } },
  doc17: { quotes: { 37: ['38', '39', '40', '41', '42', '43'] }, callouts: { 2: [3] } },
  doc18: { callouts: { 2: [3] } },
};

const TOKEN2CH = {};
for (const c of CHAPTERS) TOKEN2CH[c.token] = c.ch + '.html';

// ---------- 图片映射 ----------
const imgMeta = JSON.parse(fs.readFileSync(path.join(RAW, 'img-meta.json'), 'utf8'));
const imgByBlock = {}; // doc -> bid -> ord -> file
for (const m of imgMeta) {
  if (!m.file || m.err) continue;
  (imgByBlock[m.doc] = imgByBlock[m.doc] || {})[m.bid] = imgByBlock[m.doc][m.bid] || [];
  imgByBlock[m.doc][m.bid][m.ord || 0] = m.file;
}

// ---------- 内联 HTML 转换（基于栈的小型解析器） ----------
function selfClosing(tag) { return ['img', 'br', 'hr', 'input'].includes(tag); }

function makeInlineConverter(getCtx) {
  // getCtx(): { takeImg() } —— 每次调用取当前块的图片上下文
  return function convert(html) {
    html = String(html || '');
    let out = '';
    const stack = []; // { tag, fmt:{b,i,u,s,code,color,bg} , href }
    let i = 0;
    const n = html.length;
    let skipUntil = null; // { tag, depth } 用于跳过 svg/button 等
    let skipDepth = 0;

    const openFmt = (fmt) => {
      let s = '';
      if (fmt.b) s += '<strong>';
      if (fmt.i) s += '<em>';
      if (fmt.u) s += '<u>';
      if (fmt.s) s += '<s>';
      if (fmt.code) s += '<code>';
      if (fmt.color) s += `<span class="hl-${fmt.color}">`;
      else if (fmt.bg) s += `<span class="hbg-${fmt.bg}">`;
      return s;
    };
    const closeFmt = (fmt) => {
      let s = '';
      if (fmt.color) s += '</span>';
      else if (fmt.bg) s += '</span>';
      if (fmt.code) s += '</code>';
      if (fmt.s) s += '</s>';
      if (fmt.u) s += '</u>';
      if (fmt.i) s += '</em>';
      if (fmt.b) s += '</strong>';
      return s;
    };

    while (i < n) {
      if (skipUntil) {
        // 跳过 svg/button 等子树
        const m = html.indexOf('<', i);
        if (m === -1) break;
        const closeM = html.slice(m).match(new RegExp('^</' + skipUntil.tag + '>', 'i'));
        if (closeM) { skipDepth--; i = m + closeM[0].length; if (skipDepth <= 0) skipUntil = null; }
        else {
          const openM = html.slice(m).match(new RegExp('^<' + skipUntil.tag + '[\\s>]', 'i'));
          if (openM) skipDepth++;
          i = m + (openM ? openM[0].length : 1);
        }
        continue;
      }
      const ch = html[i];
      if (ch === '<') {
        if (html.startsWith('<!--', i)) { const e = html.indexOf('-->', i); i = e === -1 ? n : e + 3; continue; }
        const gt = html.indexOf('>', i);
        if (gt === -1) { i = n; break; }
        const rawTag = html.slice(i + 1, gt);
        i = gt + 1;
        if (rawTag.startsWith('/')) {
          const name = rawTag.slice(1).trim().toLowerCase();
          // 出栈至同名标签
          for (let k = stack.length - 1; k >= 0; k--) {
            if (stack[k].tag === name) {
              for (let j = stack.length - 1; j >= k; j--) {
                if (stack[j].fmt) out += closeFmt(stack[j].fmt);
                if (stack[j].tag === 'a') out += '</a>';
              }
              stack.length = k;
              break;
            }
          }
          continue;
        }
        const mM = rawTag.match(/^([a-zA-Z0-9-]+)/);
        if (!mM) continue;
        const tag = mM[1].toLowerCase();
        const attrs = rawTag.slice(mM[0].length);
        const attr = (name) => { const m = attrs.match(new RegExp(name + '\\s*=\\s*"([^"]*)"', 'i')); return m ? m[1] : null; };
        if (selfClosing(tag) || /\/$/.test(attrs.trimEnd())) {
          if (tag === 'img') {
            const src = attr('src') || '';
            const file = getCtx().takeImg();
            if (file) out += `<img src="${file}" alt="" loading="lazy">`;
          } else if (tag === 'br') {
            out += '<br>';
          }
          continue;
        }
        if (['svg', 'button', 'input', 'path', 'use', 'defs', 'g'].includes(tag)) { skipUntil = { tag }; skipDepth = 1; continue; }
        if (tag === 'span') {
          const ds = attr('data-string');
          const style = (attr('style') || '').toLowerCase();
          const cls = attr('class') || '';
          if (ds === 'true') {
            const fmt = {
              b: /font-weight\s*:\s*(bold|[5-9]00)/.test(style),
              i: /font-style\s*:\s*italic/.test(style),
              u: /text-decoration[^;"]*underline/.test(style),
              s: /line-through/.test(style),
              code: /(^|\s)inline-code(\s|$)/.test(cls) || /inline-code_/.test(cls),
            };
            const cm = cls.match(/textHighlight-([a-z]+)-text/);
            if (cm) fmt.color = cm[1];
            else { const bm = cls.match(/textHighlight-([a-z]+)(?!-)/); if (bm) fmt.bg = bm[1]; }
            stack.push({ tag, fmt });
            out += openFmt(fmt);
          } else {
            stack.push({ tag, fmt: null }); // 透明容器
          }
          continue;
        }
        if (tag === 'a') {
          let href = attr('href') || '';
          try { href = decodeURIComponent(href); } catch (e) {}
          const wm = href.match(/feishu\.cn\/wiki\/([A-Za-z0-9]+)/);
          if (wm && TOKEN2CH[wm[1]]) {
            out += `<a href="${TOKEN2CH[wm[1]]}">`;
          } else if (/^https?:\/\//.test(href)) {
            out += `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">`;
          } else {
            out += '<a>';
          }
          stack.push({ tag: 'a', fmt: null });
          continue;
        }
        if (tag === 'div' || tag === 'p') { stack.push({ tag: 'div', fmt: null }); continue; } // 透明
        stack.push({ tag, fmt: null }); // 其他未知标签透明处理
        continue;
      }
      // 文本节点
      const lt = html.indexOf('<', i);
      const seg = html.slice(i, lt === -1 ? n : lt);
      i = lt === -1 ? n : lt;
      const text = seg.replace(/\u200B/g, '');
      if (text) out += text;
    }
    // 收尾未闭合的
    for (let k = stack.length - 1; k >= 0; k--) {
      if (stack[k].fmt) out += closeFmt(stack[k].fmt);
      if (stack[k].tag === 'a') out += '</a>';
    }
    return out;
  };
}

function zoneToLines(zoneHTML) {
  // 按 ace-line 切分
  const parts = [];
  const re = /<div class="ace-line"[^>]*>((?:(?!<div class="ace-line")[\s\S])*)<\/div>/g;
  let m, last = 0;
  while ((m = re.exec(zoneHTML))) {
    if (typeof m[1] === 'string') parts.push(m[1]);
    last = re.lastIndex;
  }
  if (parts.length === 0 && zoneHTML.trim()) parts.push(zoneHTML);
  return parts;
}

function stripTags(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- 块渲染 ----------
function buildChapter(c) {
  const raw = JSON.parse(fs.readFileSync(path.join(RAW, c.doc + '.json'), 'utf8'));
  const blocks = raw.blocks || raw;
  const _st = STRUCTURE[c.doc] || {};
  const struct = { grids: _st.grids || {}, quotes: _st.quotes || {}, callouts: _st.callouts || {} };

  // 需要跳过的 id（容器子块）
  const skip = new Set();
  for (const gid of Object.keys(struct.grids)) {
    for (const [colId, kids] of struct.grids[gid].cols) { skip.add(colId); kids.forEach((k) => skip.add(k)); }
  }
  for (const qid of Object.keys(struct.quotes)) struct.quotes[qid].forEach((k) => skip.add(k));
  for (const cid of Object.keys(struct.callouts)) struct.callouts[cid].forEach((k) => skip.add(String(k)));

  const ids = Object.keys(blocks).map(Number).filter((id) => id !== 1 && blocks[id] && blocks[id].type !== 'page').sort((a, b) => a - b);
  const headings = [];
  let secN = 0;
  const convFactory = () => {
    const ctx = { n: 0 };
    ctx.takeImg = () => {
      const arr = (imgByBlock[c.doc] || {})[String(curBid)] || [];
      const f = arr[ctx.n++];
      return f || null;
    };
    return ctx;
  };
  let curBid = 0;
  let ctx = convFactory();
  let ctxRef = ctx;
  const conv = makeInlineConverter(() => ctxRef);

  const renderBlockInner = (b, id) => {
    curBid = id;
    ctx = convFactory();
    ctxRef = ctx;
    const payload = b.payload || {};
    const html = payload.zoneHTML || payload.outer || '';
    if (b.type === 'image') {
      // 从 outer 提取图与说明
      ctx = ctx || convFactory();
      const srcM = html.match(/<img[^>]*?src="([^"]+)"/);
      const file = (imgByBlock[c.doc] || {})[String(id)] ? (imgByBlock[c.doc][String(id)][0] || null) : null;
      let fig = '<figure class="doc-img">';
      if (file) fig += `<img src="${file}" alt="" loading="lazy">`;
      else if (srcM) fig += `<img src="${srcM[1]}" alt="" loading="lazy">`;
      const capM = html.match(/<div class="zone-container[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*$/);
      const capZone = html.split('image-caption').pop() || '';
      const capText = stripTags(capZone);
      if (capText && capText.length < 200 && /image-caption|caption/.test(html)) fig += `<figcaption>${conv(capZone)}</figcaption>`;
      fig += '</figure>';
      return fig;
    }
    const lines = zoneToLines(html).map((l) => conv(l || '')).filter((t) => stripTags(t).length > 0);
    const inner = lines.join('<br>');
    switch (b.type) {
      case 'heading1': case 'heading2': case 'heading3': case 'heading4': {
        if (!inner) return '';
        const level = Number(b.type.slice(-1)); // 1..4
        const tag = 'h' + (level + 1); // h2..h5
        let anchor = '';
        if (level <= 2) {
          secN++;
          anchor = ` id="sec-${secN}"`;
          headings.push({ id: 'sec-' + secN, text: stripTags(inner), level });
        }
        return `<${tag}${anchor}>${inner}</${tag}>`;
      }
      case 'text':
        return inner ? `<p>${inner}</p>` : '';
      case 'bullet':
        return inner ? `<li class="bl">${inner}</li>` : '';
      case 'ordered':
        return inner ? `<li class="ol">${inner}</li>` : '';
      case 'todo':
        return inner ? `<li class="todo-item"><span class="todo-box" aria-hidden="true"></span><span>${inner}</span></li>` : '';
      case 'callout':
        return ''; // 由容器逻辑处理（子块渲染进框内，避免与首子块重复）
      case 'quote_container':
        return ''; // 由容器逻辑处理
      case 'code':
        return inner ? `<pre class="code-block">${inner}</pre>` : '';
      case 'divider':
        return '<hr>';
      case 'sheet':
        return `<div class="sheet-note">📊 此处原文为一张飞书在线表格，已省略 —— <a href="https://${c.host}.feishu.cn/wiki/${c.token}" target="_blank" rel="noopener">在原文中查看表格</a>。</div>`;
      case 'grid': case 'grid_column':
        return ''; // 由容器逻辑处理
      default:
        // 未知类型：尽量以纯文本段落兜底
        return inner ? `<p>${inner}</p>` : '';
    }
  };

  // 组装正文（连续同级列表项合并为列表）
  const wrapLists = (items) => {
    let out = '';
    let buf = []; // 待包裹的 li
    let bufType = null; // 'ul' | 'ol' | 'todo'
    const flush = () => {
      if (!buf.length) { bufType = null; return; }
      if (bufType === 'ol') out += '<ol class="doc-list">' + buf.join('') + '</ol>';
      else if (bufType === 'todo') out += '<ul class="todo-list">' + buf.join('') + '</ul>';
      else out += '<ul class="doc-list">' + buf.join('') + '</ul>';
      buf = []; bufType = null;
    };
    for (const it of items) {
      if (it.kind === 'li') {
        if (bufType && bufType !== it.listType) flush();
        bufType = it.listType;
        buf.push(it.html);
      } else {
        flush();
        out += it.html;
      }
    }
    flush();
    return out;
  };

  const items = [];
  const emitBlock = (id, b) => {
    const html = renderBlockInner(b, id);
    if (!html) return;
    if (html.startsWith('<li class="bl">')) items.push({ kind: 'li', listType: 'ul', html });
    else if (html.startsWith('<li class="ol">')) items.push({ kind: 'li', listType: 'ol', html });
    else if (html.startsWith('<li class="todo-item">')) items.push({ kind: 'li', listType: 'todo', html });
    else items.push({ kind: 'html', html });
  };

  for (const id of ids) {
    if (skip.has(String(id))) continue;
    const b = blocks[id];
    if (b.type === 'grid' && struct.grids[id]) {
      // 网格：多列并排
      const cols = struct.grids[id].cols.map(([colId, kids]) => {
        const innerHtml = kids.map((kid) => renderBlockInner(blocks[kid] || { type: 'text', payload: {} }, Number(kid))).join('');
        return `<div class="grid-col">${innerHtml}</div>`;
      }).join('');
      items.push({ kind: 'html', html: `<div class="img-row">${cols}</div>` });
      continue;
    }
    if (b.type === 'callout' && struct.callouts[id]) {
      // 高亮框：全部子块渲染进框内（列表项保留列表结构）
      const kids = struct.callouts[id];
      const kidItems = [];
      for (const kid of kids) {
        const kb = blocks[kid];
        if (!kb) continue;
        const html = renderBlockInner(kb, Number(kid));
        if (!html) continue;
        if (html.startsWith('<li class="bl">')) kidItems.push({ kind: 'li', listType: 'ul', html });
        else if (html.startsWith('<li class="ol">')) kidItems.push({ kind: 'li', listType: 'ol', html });
        else if (html.startsWith('<li class="todo-item">')) kidItems.push({ kind: 'li', listType: 'todo', html });
        else kidItems.push({ kind: 'html', html });
      }
      items.push({ kind: 'html', html: `<div class="callout">${wrapLists(kidItems)}</div>` });
      continue;
    }
    if (b.type === 'quote_container') {
      const kids = struct.quotes[id];
      if (kids && kids.length) {
        const innerHtml = kids.map((kid) => {
          const kb = blocks[kid];
          if (!kb) return '';
          const html = renderBlockInner(kb, Number(kid));
          // 子块若是 li，退化为段落
          return html.replace(/^<li class="(bl|ol|todo-item)">/, '<p>').replace(/<\/li>$/, '</p>');
        }).join('');
        items.push({ kind: 'html', html: `<blockquote>${innerHtml}</blockquote>` });
      } else {
        // 兜底：用容器自身文本
        curBid = id;
        ctx = convFactory();
        ctxRef = ctx;
        const html = (b.payload || {}).zoneHTML || '';
        const lines = zoneToLines(html).map((l) => conv(l || '')).filter((t) => stripTags(t).length > 0);
        if (lines.length) items.push({ kind: 'html', html: `<blockquote><p>${lines.join('<br>')}</p></blockquote>` });
      }
      continue;
    }
    ctx = convFactory();
    emitBlock(id, b);
  }

  const bodyHtml = wrapLists(items);
  return { bodyHtml, headings, title: raw.title ? raw.title.replace(/ - 飞书云文档$/, '') : c.title, sourceUrl: `https://${c.host}.feishu.cn/wiki/${c.token}` };
}

// ---------- 页面模板 ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function sidebarHtml(active, pageToc) {
  const groups = GROUPS.map((g, gi) => {
    const chs = CHAPTERS.filter((c) => c.group === gi);
    return `<div class="nav-group"><div class="nav-group-title">${g.name}</div>` +
      chs.map((c) => `<a class="nav-link${c.ch === active ? ' active' : ''}" href="${c.ch}.html">${esc(c.title)}</a>`).join('') +
      `</div>`;
  }).join('');
  const toc = pageToc && pageToc.length ? `<div class="nav-group page-toc"><div class="nav-group-title">本页目录</div>` +
    pageToc.map((h) => `<a class="nav-link toc-${h.level}" href="#${h.id}">${esc(h.text)}</a>`).join('') + `</div>` : '';
  return `<div class="sidebar-inner">
    <a class="brand" href="index.html"><span class="brand-mark">研</span><span class="brand-text">科研入门指南</span></a>
    <div class="search-wrap"><input id="search-input" type="search" placeholder="搜索全书…  ( / )"><div id="search-results"></div></div>
    <nav class="nav">${groups}${toc}</nav>
    <div class="sidebar-foot">
      <button id="theme-toggle" title="切换深浅色">🌙 深色模式</button>
      <a class="src-link" href="https://github.com/LAMDA-NeSy/Research-Starter-Kit" target="_blank" rel="noopener">GitHub 原项目 ↗</a>
    </div>
  </div>`;
}

function chapterPage(c, idx) {
  const { bodyHtml, headings } = buildChapter(c);
  const sourceUrl = `https://${c.host}.feishu.cn/wiki/${c.token}`;
  const g = GROUPS[c.group];
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
  const pager = `<div class="pager">
    ${prev ? `<a class="pager-link prev" href="${prev.ch}.html"><span class="pager-label">上一篇</span><span class="pager-title">${esc(prev.title)}</span></a>` : '<span></span>'}
    ${next ? `<a class="pager-link next" href="${next.ch}.html"><span class="pager-label">下一篇</span><span class="pager-title">${esc(next.title)}</span></a>` : '<span></span>'}
  </div>`;
  const words = stripTags(bodyHtml).length;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)} · 科研入门指南</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="theme-init">
<div id="progress-bar"></div>
<div class="layout">
<aside class="sidebar" id="sidebar">${sidebarHtml(c.ch, headings)}</aside>
<div class="sidebar-mask" id="sidebar-mask"></div>
<main class="main">
  <div class="topbar">
    <button class="menu-btn" id="menu-btn" aria-label="目录">☰</button>
    <div class="crumbs">${g.name} · 第 ${idx + 1} / ${CHAPTERS.length} 篇</div>
    <a class="top-src" href="index.html">目录</a>
  </div>
  <article class="content">
    <header class="chapter-head">
      <div class="chapter-group">${g.name}</div>
      <h1>${esc(c.title)}</h1>
      <div class="chapter-meta">约 ${words} 字 · <a href="${sourceUrl}" target="_blank" rel="noopener">查看飞书原文 ↗</a></div>
    </header>
    <div class="doc">${bodyHtml}</div>
    ${pager}
    <footer class="chapter-foot">内容来自 <a href="https://github.com/LAMDA-NeSy/Research-Starter-Kit" target="_blank" rel="noopener">LAMDA-NeSy / Research-Starter-Kit</a>（作者：郭兰哲），本站为离线阅读副本，版权归原作者所有。</footer>
  </article>
</main>
</div>
<button id="back-top" title="回到顶部">↑</button>
<script src="assets/search-index.js"></script>
<script src="assets/book.js"></script>
</body>
</html>`;
}

function buildIndex() {
  const groupsHtml = GROUPS.map((g, gi) => {
    const chs = CHAPTERS.filter((c) => c.group === gi);
    return `<section class="toc-part"><h2>${g.name}</h2><ol class="toc-list">` +
      chs.map((c) => {
        const idx = CHAPTERS.indexOf(c);
        return `<li><a href="${c.ch}.html"><span class="toc-num">${String(idx + 1).padStart(2, '0')}</span><span class="toc-title">${esc(c.title)}</span></a></li>`;
      }).join('') + `</ol></section>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>科研入门指南 · 从 0 开始掌握做科研与写论文</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body class="theme-init">
<div id="progress-bar"></div>
<div class="layout">
<aside class="sidebar" id="sidebar">${sidebarHtml('index', [])}</aside>
<div class="sidebar-mask" id="sidebar-mask"></div>
<main class="main">
  <div class="topbar"><button class="menu-btn" id="menu-btn" aria-label="目录">☰</button><div class="crumbs">封面与目录</div><a class="top-src" href="ch01.html">开始阅读 →</a></div>
  <article class="content cover">
    <div class="cover-badge">离线阅读版</div>
    <h1 class="cover-title">科研入门指南</h1>
    <p class="cover-sub">从 0 开始，掌握做科研、写论文的基本流程</p>
    <p class="cover-desc">面向刚进入课题组参与科研的同学：如何找论文、读论文、想 Idea，如何汇报与开会，以及论文各部分的写作方法、画图、Rebuttal 与参会指南。</p>
    <div class="cover-actions"><a class="btn-primary" href="ch01.html">开始阅读 →</a><a class="btn-ghost" href="https://github.com/LAMDA-NeSy/Research-Starter-Kit" target="_blank" rel="noopener">GitHub 原项目 ↗</a></div>
    <div class="cover-meta">共 ${CHAPTERS.length} 篇 · 作者：郭兰哲（南京大学 LAMDA）· 内容版权归原作者所有</div>
    ${groupsHtml}
    <footer class="chapter-foot">本站是 <a href="https://github.com/LAMDA-NeSy/Research-Starter-Kit" target="_blank" rel="noopener">Research-Starter-Kit</a> 的离线 HTML 阅读版，内容搬运自作者公开发布的飞书文档，仅供学习交流。</footer>
  </article>
</main>
</div>
<script src="assets/search-index.js"></script>
<script src="assets/book.js"></script>
</body>
</html>`;
}

// ---------- 构建 ----------
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });

// 章节
const searchData = [];
CHAPTERS.forEach((c, idx) => {
  const { bodyHtml, headings } = buildChapter(c);
  fs.writeFileSync(path.join(OUT, c.ch + '.html'), chapterPage(c, idx), 'utf8');
  const plain = stripTags(bodyHtml);
  searchData.push({ file: c.ch + '.html', title: c.title, group: GROUPS[c.group].name, text: plain.slice(0, 20000), headings: headings.map((h) => ({ id: h.id, text: h.text })) });
  console.log(`✓ ${c.ch}.html  ${stripTags(bodyHtml).length} 字  ${headings.length} 个标题`);
});

// 首页
fs.writeFileSync(path.join(OUT, 'index.html'), buildIndex(), 'utf8');
console.log('✓ index.html');

// 搜索索引
const jsSafe = JSON.stringify(searchData).replace(/</g, '\\u003c');
fs.writeFileSync(path.join(OUT, 'assets', 'search-index.js'), 'window.SEARCH_DATA=' + jsSafe + ';', 'utf8');
console.log('✓ assets/search-index.js');
console.log('DONE');
