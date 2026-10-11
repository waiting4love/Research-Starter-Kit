# -*- coding: utf-8 -*-
# PDF 后处理流水线：重建打印版 + 封面 + 正文渲染 + 二轮回填目录页码 + 合并 + 页码印章 + 书签
# 跨平台：Windows 本地需设置 PLAYWRIGHT_CHROMIUM_PATH 指向 Edge/Chrome；
#         Linux/CI 下 Playwright 自装的 Chromium 会被自动探测，无需设置。
import os
import re
import subprocess
import sys

import pymupdf

ROOT = os.path.dirname(os.path.abspath(__file__))
BOOK = os.path.join(ROOT, 'book')
TOOLS = os.path.join(ROOT, 'tools', 'pdf')

CHAPTER_TITLES = [
    '如何做科研？', '如何找论文？', '如何读论文？', '如何想 Idea？', '如何进行学术汇报',
    '如何高效 Meeting', '一些好的习惯', '如何写论文？', '论文画图指南', '如何写论文：Abstract',
    '如何写论文：Introduction', '如何写论文：Related Works', '如何写论文：Methods',
    '如何写论文：Experiments', '如何写论文：Reference', '如何 Rebuttal',
    '学术会议参会指南', '有哪些能申请的奖学金？', 'AI 辅助科研的一些 Tips',
]
PART_OF = [0]*7 + [1]*9 + [2]*3
PART_NAMES = ['第一部分 · 如何做科研', '第二部分 · 如何写论文', '第三部分 · 杂项']


def node_env():
    env = dict(os.environ)
    if not env.get('PLAYWRIGHT_CHROMIUM_PATH'):
        env.pop('PLAYWRIGHT_CHROMIUM_PATH', None)  # 让 Playwright 自动探测自装 Chromium
    return env


def run(cmd, cwd=None):
    r = subprocess.run(cmd, capture_output=True, text=True, env=node_env(), cwd=cwd or ROOT)
    if r.returncode != 0:
        print((r.stdout or '')[-1200:], (r.stderr or '')[-800:])
        sys.exit(1)
    return r.stdout


def render_print_html():
    # 从最新章节 HTML 重建打印版（防止用旧版渲染）
    run(['node', 'build_print.js'])
    print('  print.html rebuilt')


def render_cover():
    run(['node', os.path.join('tools', 'pdf', 'html2poster.js'),
         os.path.join('book', 'cover.html'),
         '--output', os.path.join('book', 'cover.pdf'),
         '--width', '210mm'], cwd=ROOT)
    print('  cover rendered')


def render_body():
    out = run(['node', os.path.join('tools', 'pdf', 'html2pdf-next.js'),
               os.path.join('book', 'print.html'),
               '--output', os.path.join('book', 'body.pdf'),
               '--title', '科研入门指南：从0开始，掌握做科研、写论文的基本流程'], cwd=ROOT)
    m = re.search(r'Pages:\s+(\d+)', out)
    print('  body rendered:', m.group(1) if m else '?', 'pages')


def find_chapter_pages():
    doc = pymupdf.open(os.path.join(BOOK, 'body.pdf'))
    pages = []
    for pno in range(doc.page_count):
        text = doc[pno].get_text()
        if '查看飞书原文' in text:
            pages.append(pno)
    doc.close()
    if len(pages) != 19:
        print('WARN: expected 19 chapter markers, found', len(pages), pages)
    return pages


def backfill_toc(pages_body):
    # 目录显示页码 = 最终 PDF 页码 = body 页序 + 封面 1 页 + 1
    path = os.path.join(BOOK, 'print.html')
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    changed = 0
    for i, title in enumerate(CHAPTER_TITLES):
        if i >= len(pages_body):
            break
        final_page = pages_body[i] + 2  # +1 封面, +1 转为 1-based
        # 在对应章节锚点的 toc 行回填（无论当前是什么数字都替换）
        pat = r'(data-ch="ch%02d">)[^<]*' % (i + 1)
        html, n = re.subn(pat, r'\g<1>%02d' % final_page, html)
        changed += n
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('  TOC backfilled:', changed, 'entries')


def merge_and_finish(pages_body):
    doc = pymupdf.open(os.path.join(BOOK, 'body.pdf'))
    cover = pymupdf.open(os.path.join(BOOK, 'cover.pdf'))
    doc.insert_pdf(cover, start_at=0)  # 封面插到最前
    cover.close()
    # 封面页尺寸归一到与正文一致（消除亚点级差异）
    target = doc[1].rect
    p0 = doc[0]
    if abs(p0.rect.width - target.width) > 0.1 or abs(p0.rect.height - target.height) > 0.1:
        p0.set_mediabox(pymupdf.Rect(0, 0, target.width, target.height))

    # 页码印章（跳过封面）
    for pno in range(1, doc.page_count):
        page = doc[pno]
        w, h = page.rect.width, page.rect.height
        label = '- %d -' % (pno + 1)
        tw = pymupdf.get_text_length(label, fontname='helv', fontsize=9)
        page.insert_text((w / 2 - tw / 2, h - 28), label, fontname='helv', fontsize=9, color=(0.45, 0.44, 0.41))

    # 站内引用 → 内部跳转链接：在每页检索章节标题文本，命中处加 GoTo 注记
    # （Edge/Chromium 的 print-to-PDF 不会把 #锚点 转成 PDF 内部链接）
    # 兼容带空格/无空格两种写法（正文引用常写作"如何想Idea？"，标题为"如何想 Idea？"）
    added = 0
    for i, title in enumerate(CHAPTER_TITLES[:19]):
        if i >= len(pages_body):
            break
        dest0 = pages_body[i] + 1  # 0-based 最终页
        variants = [title] if ' ' not in title else [title, title.replace(' ', '')]
        for pno in range(doc.page_count):
            if pno == dest0:  # 跳过章节自身首页（避免标题自链接）
                continue
            page = doc[pno]
            hit = []
            for v in variants:
                for r in page.search_for(v):
                    if not any(r.intersects(x) for x in hit):
                        hit.append(r)
            for r in hit:
                page.insert_link({'kind': pymupdf.LINK_GOTO, 'from': r,
                                  'page': dest0, 'to': pymupdf.Point(0, 0), 'zoom': 0})
                added += 1
    print('  internal links injected:', added)

    # 书签
    toc = [[1, '封面', 1], [1, '目录', 2]]
    last_part = -1
    for i, p in enumerate(pages_body[:19]):
        final_page = p + 2
        if PART_OF[i] != last_part:
            last_part = PART_OF[i]
            toc.append([1, PART_NAMES[last_part], final_page])
        toc.append([2, CHAPTER_TITLES[i], final_page])
    doc.set_toc(toc)

    doc.set_metadata({
        'title': '科研入门指南：从0开始，掌握做科研、写论文的基本流程',
        'author': '郭兰哲',
        'subject': '面向科研新手的入门指南：找论文、读论文、想 Idea、汇报开会、论文写作、画图与 Rebuttal',
        'creator': 'Research-Starter-Kit 离线阅读版',
        'producer': 'Z.ai',
        'keywords': '科研, 论文写作, 读论文, Rebuttal, LAMDA',
    })
    out = os.path.join(BOOK, '科研入门指南.pdf')
    doc.save(out, garbage=3, deflate=True)
    print('  final saved:', out, '| pages:', doc.page_count)
    doc.close()


if __name__ == '__main__':
    print('[1/4] 重建打印版 + 渲染封面 + 首轮正文 + 定位章节页')
    render_print_html()
    render_cover()
    render_body()
    pages = find_chapter_pages()
    print('  chapter start pages (body):', pages)
    print('[2/4] 回填目录页码并重渲染')
    backfill_toc(pages)
    render_body()
    pages2 = find_chapter_pages()
    if pages2 != pages:
        print('  WARN: page shift after backfill, re-backfilling with new pages')
        backfill_toc(pages2)
        render_body()
        pages2 = find_chapter_pages()
        if pages2 != pages2:
            sys.exit('page drift did not settle')
    print('[3/4] 合并封面 + 印章 + 链接 + 书签')
    merge_and_finish(pages2)
    print('[4/4] done')
