# -*- coding: utf-8 -*-
# 将 research-book/book 下的 HTML 电子书打包为 EPUB3
import html as htmllib
import os
import re
import shutil
import sys
import uuid
import zipfile
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

BOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'book')
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'book')
OUT_EPUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '科研入门指南.epub')

TITLE = '科研入门指南'
SUBTITLE = '从0开始，掌握做科研、写论文的基本流程'
AUTHOR = '郭兰哲'
LANG = 'zh-CN'
SOURCE = 'https://github.com/LAMDA-NeSy/Research-Starter-Kit'
DESC = ('面向刚进入课题组参与科研的同学：如何找论文、读论文、想 Idea，如何汇报与开会，'
        '以及论文各部分的写作方法、画图、Rebuttal 与参会指南。离线阅读版，内容版权归原作者所有。')

CHAPTERS = ['ch%02d' % i for i in range(1, 20)]

# ---------- 从 HTML 章节中提取信息 ----------
def read_chapter(name):
    path = os.path.join(BOOK, name + '.html')
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()
    title = re.search(r'<h1>(.*?)</h1>', html).group(1)
    group = re.search(r'class="chapter-group">(.*?)</div>', html).group(1)
    src = re.search(r'href="(https://[^"]*feishu\.cn/wiki/[^"]+)"', html).group(1)
    d0 = html.index('<div class="doc">') + len('<div class="doc">')
    d1 = html.index('<div class="pager">')
    content = html[d0:d1]
    return title, group, src, content

def sanitize(content):
    s = content
    # 去掉 <div class="doc"> 包装层自己的闭合标签
    s = re.sub(r'</div>\s*$', '', s)
    # 站内章节引用改为 EPUB 包内锚点（包内文件是 .xhtml）
    s = re.sub(r'href="ch(\d{2})\.html"', r'href="ch\1.xhtml"', s)
    s = s.replace('<br>', '<br/>').replace('<hr>', '<hr/>')
    s = re.sub(r'<img([^>]*?)\s*/?>', lambda m: '<img' + m.group(1).rstrip() + '/>', s)
    s = s.replace('&nbsp;', '&#160;')
    s = s.replace('assets/img/', 'images/')
    # 检查未知的命名实体（XML 只认 amp/lt/gt/quot/apos）
    for ent in set(re.findall(r'&([a-zA-Z]+);', s)):
        if ent not in ('amp', 'lt', 'gt', 'quot', 'apos'):
            raise ValueError('unknown entity &%s;' % ent)
    return s

def strip_tags(s):
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\s+', '', s.replace('&#160;', ' '))

# ---------- 封面 ----------
def make_cover_png(path):
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return False
    W, H = 1200, 1600
    bg = (247, 245, 241)
    fg = (43, 42, 39)
    accent = (179, 84, 30)
    soft = (107, 103, 95)
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)

    def font(name_candidates, size):
        for cand in name_candidates:
            if os.path.exists(cand):
                try:
                    return ImageFont.truetype(cand, size)
                except Exception:
                    continue
        return ImageFont.load_default()

    hei = [r'C:\Windows\Fonts\simhei.ttf', r'C:\Windows\Fonts\msyhbd.ttc', r'C:\Windows\Fonts\msyh.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']
    yh = [r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc']

    # 顶部装饰条
    d.rectangle([0, 0, W, 14], fill=accent)
    # 徽标章
    d.rounded_rectangle([90, 110, 154, 174], radius=16, fill=accent)
    f_mark = font(hei, 40)
    d.text((122, 142), '研', font=f_mark, fill=(255, 255, 255), anchor='mm')
    # 书名
    f_title = font(hei, 130)
    d.text((W / 2, 480), TITLE, font=f_title, fill=fg, anchor='mm')
    # 副标题
    f_sub = font(yh, 44)
    d.text((W / 2, 620), SUBTITLE, font=f_sub, fill=soft, anchor='mm')
    # 分隔线
    d.rectangle([90, 720, W - 90, 726], fill=accent)
    # 目录提示（三部分）
    f_part = font(yh, 38)
    parts = ['一、如何做科研', '二、如何写论文', '三、杂项']
    y = 810
    for p in parts:
        d.text((W / 2, y), p, font=f_part, fill=fg, anchor='mm')
        y += 90
    # 底部信息
    f_small = font(yh, 34)
    d.text((W / 2, H - 150), '作者：%s（南京大学 LAMDA）' % AUTHOR, font=f_small, fill=soft, anchor='mm')
    d.text((W / 2, H - 95), '共 19 篇 · 离线阅读版', font=f_small, fill=soft, anchor='mm')
    img.save(path, 'PNG', optimize=True)
    return True

# ---------- 组装 XHTML ----------
XHTML_TMPL = '''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head>
<title>{title}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<section epub:type="chapter">
<header>
<p class="part">{group}</p>
<h1>{title}</h1>
<p class="meta">约 {words} 字 · <a href="{src}">查看飞书原文</a></p>
</header>
{content}
</section>
</body>
</html>
'''

COVER_XHTML_SVG = '''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
<head><title>封面</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body class="cover-body" style="margin:0;text-align:center;">
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1200 1600" width="100%" preserveAspectRatio="xMidYMid meet">
<rect width="1200" height="1600" fill="#f7f5f1"/>
<rect width="1200" height="14" fill="#b3541e"/>
<text x="600" y="480" font-size="120" font-family="SimHei, sans-serif" fill="#2b2a27" text-anchor="middle" font-weight="bold">科研入门指南</text>
<text x="600" y="620" font-size="42" font-family="Microsoft YaHei, sans-serif" fill="#6b675f" text-anchor="middle">从0开始，掌握做科研、写论文的基本流程</text>
<rect x="90" y="720" width="1020" height="6" fill="#b3541e"/>
<text x="600" y="830" font-size="38" font-family="Microsoft YaHei, sans-serif" fill="#2b2a27" text-anchor="middle">一、如何做科研</text>
<text x="600" y="920" font-size="38" font-family="Microsoft YaHei, sans-serif" fill="#2b2a27" text-anchor="middle">二、如何写论文</text>
<text x="600" y="1010" font-size="38" font-family="Microsoft YaHei, sans-serif" fill="#2b2a27" text-anchor="middle">三、杂项</text>
<text x="600" y="1450" font-size="34" font-family="Microsoft YaHei, sans-serif" fill="#6b675f" text-anchor="middle">作者：郭兰哲（南京大学 LAMDA）</text>
<text x="600" y="1505" font-size="34" font-family="Microsoft YaHei, sans-serif" fill="#6b675f" text-anchor="middle">共 19 篇 · 离线阅读版</text>
</svg>
</body>
</html>
'''

STYLE_CSS = '''body { font-family: "Source Han Serif SC", "Noto Serif SC", Georgia, "Songti SC", SimSun, serif; line-height: 1.8; margin: 1em; color: #2b2a27; }
h1 { font-size: 1.7em; margin: 0.4em 0 0.6em; line-height: 1.4; }
h2 { font-size: 1.4em; margin: 1.5em 0 0.6em; }
h3 { font-size: 1.2em; margin: 1.3em 0 0.5em; }
h4, h5 { font-size: 1.05em; margin: 1.2em 0 0.5em; }
p { margin: 0.7em 0; text-align: justify; }
blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #b3541e; background: #f3efe7; color: inherit; }
.callout { margin: 1em 0; padding: 0.6em 1em; background: #fdf6e9; border: 1px solid #e3ddd2; border-radius: 8px; }
code, pre { font-family: Consolas, monospace; font-size: 0.85em; background: #efece5; }
pre { padding: 0.7em 1em; overflow-x: hidden; white-space: pre-wrap; word-wrap: break-word; }
img { max-width: 100%; height: auto; }
p img, li img, a img, blockquote img { display: inline-block; height: 1.1em; width: auto; vertical-align: -0.2em; }
figure { margin: 1.2em 0; text-align: center; }
figure figcaption { font-size: 0.8em; color: #6b675f; }
.img-row { display: block; }
.img-row .grid-col { margin: 0.8em 0; }
header .part { font-size: 0.85em; color: #b3541e; letter-spacing: 1px; margin: 0; }
header .meta { font-size: 0.8em; color: #6b675f; }
header h1 { margin: 0.2em 0 0.4em; }
a { color: #b3541e; }
hr { border: none; border-top: 1px solid #e3ddd2; width: 60%; margin: 2em auto; }
ul.todo-list, ul.doc-list, ol.doc-list { padding-left: 1.5em; }
.todo-box { display: inline-block; width: 0.8em; height: 0.8em; border: 1.5px solid #6b675f; border-radius: 3px; margin-right: 0.4em; }
.sheet-note { background: #fdf6e9; border: 1px dashed #e3ddd2; padding: 0.6em 1em; border-radius: 8px; color: #6b675f; font-size: 0.9em; }
.hl-red, .hl-pink { color: #c23b3b; }
.hl-blue { color: #2563c9; }
.hl-green { color: #1f7a3d; }
.hl-orange { color: #b3541e; }
.hl-purple { color: #7a3fb0; }
.hl-yellow { color: #9c7a10; }
.hbg-yellow { background: rgba(230, 200, 60, 0.35); }
.hbg-pink, .hbg-red { background: rgba(220, 100, 100, 0.2); }
.hbg-blue { background: rgba(80, 140, 220, 0.2); }
.hbg-green { background: rgba(80, 190, 110, 0.2); }
@media (prefers-color-scheme: dark) {
  body { background: #14171c; color: #d8d5cf; }
  blockquote { background: #1e232b; }
  .callout, .sheet-note { background: #232a33; border-color: #2a2f38; }
  code, pre { background: #22272f; }
}
'''

NAV_TMPL = '''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN" lang="zh-CN">
<head><title>目录</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
<nav epub:type="toc" id="toc">
<h1>目录</h1>
{toc}
</nav>
<nav epub:type="landmarks" hidden="hidden">
<ol>
<li><a epub:type="cover" href="cover.xhtml">封面</a></li>
<li><a epub:type="bodymatter" href="{first}">正文</a></li>
</ol>
</nav>
</body>
</html>
'''

NCX_TMPL = '''<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="zh-CN">
<head>
<meta name="dtb:uid" content="{uid}"/>
<meta name="dtb:depth" content="2"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>{title}</text></docTitle>
<navMap>
{navpoints}
</navMap>
</ncx>
'''

def xml_escape(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

def main():
    chapters = []
    for name in CHAPTERS:
        title, group, src, content = read_chapter(name)
        content = sanitize(content)
        words = len(strip_tags(content))
        xhtml = XHTML_TMPL.format(title=xml_escape(title), group=xml_escape(group),
                                  words=words, src=xml_escape(src), content=content)
        try:
            ET.fromstring(xhtml.encode('utf-8'))
        except ET.ParseError as e:
            print('XML ERROR in %s: %s' % (name, e))
            with open(name + '.bad.xml', 'w', encoding='utf-8') as f:
                f.write(xhtml)
            sys.exit(1)
        chapters.append({'name': name, 'title': title, 'group': group, 'src': src, 'xhtml': xhtml, 'words': words})
        print('✓ %s  %s  (%d 字)' % (name, title, words))

    # 图片清单
    img_dir = os.path.join(BOOK, 'assets', 'img')
    images = sorted(os.listdir(img_dir))
    mime_map = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml'}

    # 分组结构（保持顺序）
    parts = []
    for ch in chapters:
        if not parts or parts[-1]['name'] != ch['group']:
            parts.append({'name': ch['group'], 'chapters': []})
        parts[-1]['chapters'].append(ch)

    # nav 目录
    toc_lines = []
    np_lines = []
    order = 0
    for pi, part in enumerate(parts):
        toc_lines.append('<li><span>%s</span><ol>' % xml_escape(part['name']))
        np_open = '<navPoint id="np-p%d" playOrder="%d"><navLabel><text>%s</text></navLabel><content src="ch%02d.xhtml"/>' % (
            pi + 1, order + 1, xml_escape(part['name']), 1)
        # 分组节点指向该部分第一章
        first_src = part['chapters'][0]['name'] + '.xhtml'
        np_lines.append('<navPoint id="np-p%d" playOrder="%d"><navLabel><text>%s</text></navLabel><content src="%s"/>' % (
            pi + 1, order + 1, xml_escape(part['name']), first_src))
        for ch in part['chapters']:
            order += 1
            toc_lines.append('<li><a href="%s.xhtml">%s</a></li>' % (ch['name'], xml_escape(ch['title'])))
            np_lines.append('<navPoint id="np-%s" playOrder="%d"><navLabel><text>%s</text></navLabel><content src="%s.xhtml"/></navPoint>' % (
                ch['name'], order + 1, xml_escape(ch['title']), ch['name']))
        toc_lines.append('</ol></li>')
        np_lines.append('</navPoint>')

    uid = 'urn:uuid:' + str(uuid.uuid4())
    now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # 封面
    os.makedirs(os.path.join(RAW, 'epub_tmp', 'images'), exist_ok=True)
    cover_png = os.path.join(RAW, 'epub_tmp', 'images', 'cover.png')
    has_raster_cover = make_cover_png(cover_png)

    # manifest
    manifest = []
    if has_raster_cover:
        manifest.append('<item id="cover-image" href="images/cover.png" media-type="image/png" properties="cover-image"/>')
    else:
        manifest.append('<item id="cover-svg" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/>')
    manifest.append('<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>')
    manifest.append('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
    manifest.append('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>')
    manifest.append('<item id="css" href="style.css" media-type="text/css"/>')
    for ch in chapters:
        manifest.append('<item id="%s" href="%s.xhtml" media-type="application/xhtml+xml"/>' % (ch['name'], ch['name']))
    for im in images:
        if im == 'cover.png':
            continue
        ext = os.path.splitext(im)[1].lower()
        manifest.append('<item id="img-%s" href="images/%s" media-type="%s"/>' % (
            os.path.splitext(im)[0], im, mime_map[ext]))

    spine = ['<itemref idref="cover"/>'] + ['<itemref idref="%s"/>' % ch['name'] for ch in chapters]

    opf = '''<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="zh-CN">
<meta xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">{uid}</dc:identifier>
<dc:title>{title}</dc:title>
<dc:creator id="creator">{author}</dc:creator>
<meta refines="#creator" property="role" scheme="marc:relators">aut</meta>
<dc:language>{lang}</dc:language>
<dc:description>{desc}</dc:description>
<dc:source>{source}</dc:source>
<meta property="dcterms:modified">{now}</meta>
<meta name="cover" content="cover-image"/>
</meta>
<manifest>
{manifest}
</manifest>
<spine toc="ncx">
{spine}
</spine>
</package>
'''.format(uid=uid, title=xml_escape(TITLE), author=xml_escape(AUTHOR), lang=LANG,
           desc=xml_escape(DESC), source=SOURCE, now=now,
           manifest='\n'.join(manifest), spine='\n'.join(spine))

    ET.fromstring(opf.encode('utf-8'))  # 验证

    nav = NAV_TMPL.format(toc='\n'.join(toc_lines), first=chapters[0]['name'] + '.xhtml')
    ET.fromstring(nav.encode('utf-8'))
    ncx = NCX_TMPL.format(uid=uid, title=xml_escape(TITLE), navpoints='\n'.join(np_lines))
    ET.fromstring(ncx.encode('utf-8'))

    if has_raster_cover:
        cover_page = '''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN" lang="zh-CN">
<head><title>封面</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body style="margin:0;text-align:center;">
<div><img src="images/cover.png" alt="封面" style="max-width:100%;"/></div>
</body>
</html>
'''
    else:
        cover_page = COVER_XHTML_SVG

    # 打包 ZIP
    if os.path.exists(OUT_EPUB):
        os.remove(OUT_EPUB)
    zf = zipfile.ZipFile(OUT_EPUB, 'w')
    zi = zipfile.ZipInfo('mimetype')
    zf.writestr(zi, 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    zf.writestr('META-INF/container.xml', '''<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles>
<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
</rootfiles>
</container>
''', compress_type=zipfile.ZIP_DEFLATED)
    zf.writestr('OEBPS/content.opf', opf, compress_type=zipfile.ZIP_DEFLATED)
    zf.writestr('OEBPS/nav.xhtml', nav, compress_type=zipfile.ZIP_DEFLATED)
    zf.writestr('OEBPS/toc.ncx', ncx, compress_type=zipfile.ZIP_DEFLATED)
    zf.writestr('OEBPS/style.css', STYLE_CSS, compress_type=zipfile.ZIP_DEFLATED)
    zf.writestr('OEBPS/cover.xhtml', cover_page, compress_type=zipfile.ZIP_DEFLATED)
    if not has_raster_cover:
        zf.writestr('OEBPS/cover.svg', '''<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#f7f5f1"/><text x="600" y="800" font-size="120" text-anchor="middle" fill="#b3541e">科研入门指南</text></svg>''', compress_type=zipfile.ZIP_DEFLATED)
    for ch in chapters:
        zf.writestr('OEBPS/%s.xhtml' % ch['name'], ch['xhtml'], compress_type=zipfile.ZIP_DEFLATED)
    for im in images:
        with open(os.path.join(img_dir, im), 'rb') as f:
            zf.writestr('OEBPS/images/' + im, f.read(), compress_type=zipfile.ZIP_DEFLATED)
    if has_raster_cover:
        with open(cover_png, 'rb') as f:
            zf.writestr('OEBPS/images/cover.png', f.read(), compress_type=zipfile.ZIP_DEFLATED)
    else:
        zf.writestr('OEBPS/cover.svg', '''<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#f7f5f1"/><text x="600" y="800" font-size="120" text-anchor="middle" fill="#b3541e">科研入门指南</text></svg>''', compress_type=zipfile.ZIP_DEFLATED)
    zf.close()

    # 清理封面临时目录
    shutil.rmtree(os.path.join(RAW, 'epub_tmp'), ignore_errors=True)

    size = os.path.getsize(OUT_EPUB)
    print('✓ EPUB 生成: %s (%.1f MB)' % (OUT_EPUB, size / 1048576))

if __name__ == '__main__':
    main()
