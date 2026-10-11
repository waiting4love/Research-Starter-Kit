// 打印版整合 HTML 生成器：封面 + 目录 + 19 章正文（A4，供 html2pdf-next.js 渲染）
'use strict';
const fs = require('fs');
const path = require('path');

const BOOK = path.join(__dirname, 'book');
const OUT = path.join(BOOK, 'print.html');       // 目录 + 正文
const COVER_OUT = path.join(BOOK, 'cover.html'); // 整页封面（html2poster 渲染）

const PARTS = ['第一部分 · 如何做科研', '第二部分 · 如何写论文', '第三部分 · 杂项'];

function readChapter(name) {
  const html = fs.readFileSync(path.join(BOOK, name + '.html'), 'utf8');
  const title = html.match(/<h1>(.*?)<\/h1>/)[1];
  const group = html.match(/class="chapter-group">(.*?)<\/div>/)[1];
  const src = html.match(/href="(https:\/\/[^"]*feishu\.cn\/wiki\/[^"]+)"/)[1];
  const words = (html.match(/约 (\d+) 字/) || [0, '?'])[1];
  const d0 = html.indexOf('<div class="doc">') + '<div class="doc">'.length;
  const d1 = html.indexOf('<div class="pager">');
  let content = html.slice(d0, d1);
  content = content.replace(/<\/div>\s*$/, ''); // 去掉 .doc 包装层自身的闭合标签
  content = content.replace(/href="ch(\d{2})\.html"/g, 'href="#ch$1"'); // 站内引用 → 文内章节锚点
  return { name, title, group, src, words, content };
}

const chapters = [];
for (let i = 1; i <= 19; i++) {
  const n = 'ch' + String(i).padStart(2, '0');
  chapters.push(readChapter(n));
}

// 目录（页码占位 "00"，渲染后二轮回填）
const tocParts = PARTS.map((p) => {
  const chs = chapters.filter((c) => c.group === p);
  return `<div class="toc-part"><div class="toc-part-title">${p}</div>` +
    chs.map((c) => `<a class="toc-row" href="#${c.name}"><span class="toc-t">${c.title}</span><span class="toc-dots"></span><span class="toc-p" data-ch="${c.name}">00</span></a>`).join('') +
    `</div>`;
}).join('\n');

const chapterHtml = chapters.map((c) => `<section class="chapter" id="${c.name}">
<div class="ch-head">
  <div class="ch-group">${c.group}</div>
  <h1>${c.title}</h1>
  <div class="ch-meta">约 ${c.words} 字 · <a href="${c.src}">查看飞书原文 ↗</a></div>
</div>
<div class="doc">
${c.content}
</div>
</section>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>科研入门指南</title>
<style>
@page { size: A4; margin: 20mm 18mm 22mm 18mm; }
html, body { margin: 0; padding: 0; background: #faf8f4; }
body {
  font-family: "SimSun", "Source Han Serif SC", "Noto Serif SC", serif;
  font-size: 11.5pt; line-height: 1.95; color: #2b2a27;
  line-break: strict;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

/* ---------- 目录 ---------- */
.toc { page-break-after: always; }
.toc > h1 { font-family: "Microsoft YaHei", sans-serif; font-size: 20pt; margin: 0 0 10mm; }
.toc-part { margin-bottom: 9mm; }
.toc-part-title {
  font-family: "Microsoft YaHei", sans-serif; font-size: 13pt; color: #b3541e;
  border-left: 3.5px solid #b3541e; padding-left: 8px; margin-bottom: 4mm; font-weight: 700;
}
.toc-row { display: flex; align-items: baseline; text-decoration: none; color: #2b2a27; margin: 2.6mm 0 2.6mm 12px; font-size: 11.5pt; }
.toc-t { flex: none; }
.toc-dots { flex: 1; border-bottom: 1px dotted #c9c2b4; margin: 0 2mm 1.2mm; }
.toc-p { flex: none; font-family: Georgia, serif; color: #6b675f; font-size: 10.5pt; }

/* ---------- 章节 ---------- */
.chapter { page-break-before: always; }
.ch-head { break-inside: avoid; margin-bottom: 9mm; }
.ch-group { font-family: "Microsoft YaHei", sans-serif; font-size: 10.5pt; color: #b3541e; letter-spacing: 2px; }
.ch-head h1 {
  font-family: "Microsoft YaHei", sans-serif; font-size: 23pt; margin: 2.5mm 0 3mm; line-height: 1.4;
  break-after: avoid;
}
.ch-meta { font-size: 9.5pt; color: #6b675f; border-bottom: 1px solid #e3ddd2; padding-bottom: 3mm; }
.ch-meta a { color: #6b675f; text-decoration: none; }

/* ---------- 正文 ---------- */
.doc { text-align: justify; }
.doc p { margin: 0.55em 0; }
.doc h2, .doc h3, .doc h4, .doc h5 { font-family: "Microsoft YaHei", sans-serif; break-after: avoid; color: #2b2a27; }
.doc h2 { font-size: 15.5pt; margin: 1.35em 0 0.55em; }
.doc h3 { font-size: 13pt; margin: 1.2em 0 0.45em; }
.doc h4, .doc h5 { font-size: 11.5pt; margin: 1.1em 0 0.4em; }
.doc ul.doc-list, .doc ol.doc-list, .doc ul.todo-list { margin: 0.45em 0; padding-left: 1.7em; }
.doc li { margin: 0.28em 0; }
.doc li.bl::marker, .doc ol.doc-list > li::marker { color: #b3541e; }
.doc blockquote {
  margin: 0.8em 0; padding: 2.6mm 5mm; background: #f3efe7;
  border-left: 3px solid #b3541e; break-inside: avoid;
}
.doc blockquote p { margin: 0.25em 0; }
.doc .callout {
  margin: 0.8em 0; padding: 3mm 5mm; background: #fdf6e9;
  border: 1px solid #e3ddd2; border-radius: 8px; break-inside: avoid; font-size: 10.5pt;
}
.doc .callout p { margin: 0.3em 0; }
.doc code { font-family: Consolas, monospace; font-size: 0.82em; background: #efece5; padding: 1px 4px; border-radius: 3px; }
.doc pre.code-block {
  background: #efece5; padding: 3.5mm 5mm; font-size: 9.5pt; line-height: 1.6;
  white-space: pre-wrap; word-wrap: break-word; break-inside: avoid; border: 1px solid #e3ddd2;
}
.doc pre.code-block code { background: none; padding: 0; }
.doc a { color: #b3541e; text-decoration: none; }
.doc hr { border: none; border-top: 1px solid #e3ddd2; width: 55%; margin: 1.4em auto; }
.doc img { max-width: 100%; height: auto; }
.doc p img, .doc li img, .doc a img, .doc blockquote img, .doc .callout img { display: inline-block; height: 12pt; width: auto; vertical-align: -0.18em; margin: 0 2px; }
.doc figure.doc-img { margin: 1em 0; text-align: center; break-inside: avoid; }
.doc figure.doc-img figcaption { font-size: 8.5pt; color: #6b675f; margin-top: 1.5mm; text-align: center; }
.img-row { display: flex; gap: 4mm; align-items: flex-start; break-inside: avoid; margin: 1em 0; }
.img-row .grid-col { flex: 1; min-width: 0; }
.img-row figure.doc-img { margin: 0; }
.todo-list { list-style: none; padding-left: 0.4em; }
.todo-item { display: flex; gap: 2.2mm; align-items: flex-start; }
.todo-box { flex: none; width: 3.6mm; height: 3.6mm; margin-top: 1.6mm; border: 0.45mm solid #6b675f; border-radius: 1mm; }
.sheet-note {
  margin: 0.9em 0; padding: 3mm 5mm; font-size: 9.5pt; color: #6b675f;
  background: #fdf6e9; border: 1px dashed #d8cfc0; break-inside: avoid;
}
.hl-red, .hl-pink { color: #c23b3b; }
.hl-blue { color: #2563c9; }
.hl-green { color: #1f7a3d; }
.hl-orange { color: #b3541e; }
.hl-purple { color: #7a3fb0; }
.hl-yellow { color: #9c7a10; }
.hbg-yellow { background: rgba(230, 200, 60, 0.32); }
.hbg-pink, .hbg-red { background: rgba(220, 100, 100, 0.16); }
.hbg-blue { background: rgba(80, 140, 220, 0.16); }
.hbg-green { background: rgba(80, 190, 110, 0.16); }
</style>
</head>
<body>

<section class="toc">
  <h1>目 录</h1>
${tocParts}
</section>

${chapterHtml}

</body>
</html>
`;

// 整页封面（绝对定位版式，由 html2poster.js 单独渲染为单页 PDF）
const coverHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>封面</title>
<style>
html, body { margin: 0; padding: 0; background: #f7f5f1; }
.poster {
  width: 210mm; height: 297mm; position: relative; background: #f7f5f1;
  font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #2b2a27;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.topbar { position: absolute; top: 0; left: 0; width: 210mm; height: 5mm; background: #b3541e; }
.badge {
  position: absolute; top: 30mm; left: 24mm; width: 15mm; height: 15mm; border-radius: 4mm;
  background: #b3541e; color: #fff; font-size: 20pt; font-weight: 700;
  text-align: center; line-height: 15mm;
}
.kind { position: absolute; top: 32.5mm; left: 43mm; font-size: 11pt; letter-spacing: 4px; color: #6b675f; }
.title {
  position: absolute; top: 84mm; left: 0; width: 210mm; text-align: center;
  font-size: 42pt; font-weight: 700; letter-spacing: 8px; margin: 0;
}
.sub {
  position: absolute; top: 108mm; left: 0; width: 210mm; text-align: center;
  font-size: 14.5pt; color: #6b675f; letter-spacing: 1px;
}
.rule { position: absolute; top: 130mm; left: 24mm; width: 162mm; height: 1.2mm; background: #b3541e; }
.parts { position: absolute; top: 147mm; left: 0; width: 210mm; text-align: center; font-size: 13pt; line-height: 2.5; }
.foot {
  position: absolute; top: 252mm; left: 0; width: 210mm; text-align: center;
  font-size: 11pt; color: #6b675f; line-height: 1.9;
}
</style>
</head>
<body>
<div class="poster">
  <div class="topbar"></div>
  <div class="badge">研</div>
  <div class="kind">离线阅读版</div>
  <h1 class="title">科研入门指南</h1>
  <div class="sub">从 0 开始，掌握做科研、写论文的基本流程</div>
  <div class="rule"></div>
  <div class="parts">一、如何做科研<br>二、如何写论文<br>三、杂项</div>
  <div class="foot">作者：郭兰哲（南京大学 LAMDA）<br>共 19 篇 · 内容来自 Research-Starter-Kit，版权归原作者所有</div>
</div>
</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log('✓ print.html 生成:', OUT, '(' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)');
fs.writeFileSync(COVER_OUT, coverHtml, 'utf8');
console.log('✓ cover.html 生成:', COVER_OUT);
