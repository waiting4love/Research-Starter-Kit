# 科研入门指南 · 离线电子书

内容来自本仓库（[LAMDA-NeSy/Research-Starter-Kit](https://github.com/LAMDA-NeSy/Research-Starter-Kit)，作者：郭兰哲 / 南京大学 LAMDA）公开发布的飞书文档，抓取整理为离线阅读版，版权归原作者所有。

## 三种格式

| 文件 | 说明 |
|---|---|
| `index.html` | 网页版：侧栏导航、全文搜索、深色模式，双击即读，无需服务器 |
| `科研入门指南.epub` | EPUB 3：含封面、嵌套目录、书签，适合 Apple Books / Calibre / 手机阅读器 |
| `科研入门指南.pdf` | A4 排版：封面、目录页码、页脚页码、阅读器书签导航，可直接打印 |

## 重建方法

依赖：Node.js、Python 3（`pymupdf`）、Playwright（可用系统 Edge：`PLAYWRIGHT_CHROMIUM_PATH` 指向 msedge.exe）。

```bash
node build.js          # 生成 HTML 静态书（book/）
python build_epub.py   # 生成 EPUB（需 raw/ 数据）
python finish_pdf.py   # 生成 PDF（需 raw/ 数据 + Playwright/Edge）
```

- `raw/*.json`：从飞书文档抓取的块级结构数据（构建的输入，含完整性校验记录）
- `build.js` / `build_epub.py` / `build_print.js` / `finish_pdf.py`：HTML、EPUB、打印版与 PDF 流水线脚本
