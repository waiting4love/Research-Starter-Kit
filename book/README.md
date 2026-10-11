# 科研入门指南 · 离线电子书

内容来自本仓库（[LAMDA-NeSy/Research-Starter-Kit](https://github.com/LAMDA-NeSy/Research-Starter-Kit)，作者：郭兰哲 / 南京大学 LAMDA）公开发布的飞书文档，抓取整理为离线阅读版，版权归原作者所有。

## 三种格式

| 文件 | 说明 |
|---|---|
| `index.html` | 网页版：侧栏导航、全文搜索、深色模式，双击即读，无需服务器 |
| `科研入门指南.epub` | EPUB 3：含封面、嵌套目录、书签，适合 Apple Books / Calibre / 手机阅读器 |
| `科研入门指南.pdf` | A4 排版：封面、目录页码、页脚页码、阅读器书签导航，可直接打印 |

**EPUB 与 PDF 由 CI 自动生成**：推送到 `ebook` 分支后，[Actions 工作流](../../actions/workflows/ebook.yml)会自动构建并在 Artifacts 里提供下载（二进制文件不入库）。

## 本地重建

依赖：Node.js 20+、Python 3（`pymupdf`、`pillow`）、Playwright Chromium（Linux 自动探测；Windows 本地需设 `PLAYWRIGHT_CHROMIUM_PATH` 指向 Edge/Chrome）。

```bash
node build.js          # 生成 HTML 静态书（book/）
python build_epub.py   # 生成 EPUB
python finish_pdf.py   # 生成 PDF（tools/pdf 为渲染脚本）
```

- `raw/*.json`：从飞书文档抓取的块级结构数据（构建输入，36 张插图已本地化）
- `build.js` / `build_epub.py` / `build_print.js` / `finish_pdf.py`：HTML、EPUB、打印版与 PDF 流水线
- `tools/pdf/`：Playwright 渲染脚本（来自 ZCode pdf 技能）
- `.github/workflows/ebook.yml`：CI 构建（Ubuntu + Playwright Chromium + Noto CJK 字体）
