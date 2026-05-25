# vRain 集成踩坑记录

> 日期：2026-05-24
> 状态：已解决，PDF 生成成功

---

## 背景

[vRain](https://github.com/shanleiguang/vRain) 是一个 Perl 编写的中文古籍刻本 PDF 生成工具。我们用它作为归源的 PDF 导出引擎。

## 踩坑清单

### 坑 1：Java ProcessBuilder 找不到 perl

**现象**：`CreateProcess error=2, 系统找不到指定的文件`

**根因**：Java `ProcessBuilder` 不继承 Windows 系统 PATH，即使 Strawberry Perl 已安装。且 Git Bash 自带的 Perl（`/usr/bin/perl`）缺少 `PDF::Builder` 模块。

**解决**：优先检查 Strawberry Perl 路径，再 fallback 到 PATH 自动发现。

```java
// VrainExportService.findPerl()
1. 常见路径枚举（D:\code_tools\strawberry-perl-xxx\perl\bin\perl.exe）
2. cmd.exe /c where perl  → 自动发现（注意：Git Bash Perl 可能缺乏 PDF::Builder）
3. 兜底："perl"
```

### 坑 2：Font::FreeType DLL 找不到

**现象**：`Can't load FreeType.xs.dll ... 找不到指定的模块`

**根因**：`FreeType.xs.dll` 依赖 `c/bin/` 下的 `libfreetype-6__.dll` 及更多 DLL，Java 子进程的 PATH 不包含这个目录。

**解决**：设置子进程 PATH 包含 `perl/bin` 和 `c/bin`。

```java
String perlBin = Path.of(perlExe).getParent().toString();
String perlCBin = Path.of(perlExe).getParent().getParent().getParent()
                       .resolve("c").resolve("bin").toString();
pb.environment().put("PATH", perlBin + ";" + perlCBin + ";" + currentPath);
```

**教训**：`getParent()` 要算对层数！`perl.exe` 在 `perl/bin/`，`c/bin/` 在 Strawberry 根目录，需要 3 次 `getParent()`。

### 坑 3：book.cfg 缺字段导致 Perl warning 和 exit

**现象**：`Use of uninitialized value $xxx` 然后 `A font size is required`

**根因**：vRain 的 `book.cfg` 需要以下字段，缺一不可：

| 字段 | 用途 | 示例值 |
|------|------|--------|
| `title_font_size` | 页标题字号 | 42 |
| `title_font_color` | 标题颜色 | black |
| `title_y` | 标题垂直位置 | 1700 |
| `title_ydis` | 标题字间距 | 1.2 |
| `if_tpcenter` | 标题居中 | 1 |
| `pager_font_size` | 页码字号 | 24 |
| `pager_font_color` | 页码颜色 | black |
| `pager_y` | 页码垂直位置 | 100 |
| `cover_title_font_size` | 封面标题字号 | 48 |
| `cover_title_y` | 封面标题位置 | 400 |
| `cover_author_font_size` | 封面作者字号 | 32 |
| `cover_author_y` | 封面作者位置 | 200 |
| `cover_font_color` | 封面文字颜色 | black |
| `if_nocomma` | 无标点模式 | 0 |
| `if_onlyperiod` | 标点归一化 | 0 |
| `text_comma_nop` | 正文不占位标点 | 空 |
| `comment_comma_nop` | 批注不占位标点 | 空 |

### 坑 4：Windows 下 Perl 写中文文件名失败

**现象**：`Unable to open books_mr/gy_7/《2》文本1至1.pdf for writing`

**根因**：`PDF::Builder->save()` 在 Windows Perl 下无法写入含中文的文件名。

**解决**：修改 `vrain_mr.pl`，把 PDF 文件名改为纯 ASCII：`$pdfn = $book_id."_vrain"`。

### 坑 5：Perl 模块安装（Windows）

**安装命令**：
```powershell
cpan PDF::Builder Font::FreeType Encode::HanConvert
```

**注意**：
- 必须先装 Strawberry Perl（自带 gcc、gmake）
- 必须先装 ImageMagick Windows 版（勾选 "Install legacy utilities"）
- 第 3 个模块编译时间长（Font::FreeType 需要编译 C 扩展）
- **不需要** `cpan Image::Magick`——vRain 主脚本用的是预生成背景图

## vRain 与归源的集成架构

```
PublishingStudio.vue  →  点「付梓导出」
       ↓
POST /api/publishing/drafts/{id}/export
       ↓
VrainExportService.java
   ├─ generateTextFromLineageData()  → 解析 sheet.layoutData JSON
   ├─ generateBookCfg()              → 生成 book.cfg
   ├─ 写入 books_mr/gy_{id}/text/01.txt
   └─ runVrain()
        ├─ findPerl()  → 自动发现 perl.exe
        ├─ 设置 PATH 环境变量
        ├─ perl vrain_mr.pl -b gy_{id} -f 1
        └─ 返回 PDF 路径
```

## 文件位置

| 文件 | 路径 |
|------|------|
| vRain 引擎 | `backend/vrain/` |
| 字体（88MB） | `backend/vrain/fonts/` |
| 背景图 | `backend/vrain/canvas/` |
| 生成的书稿 | `backend/vrain/books_mr/gy_{draftId}/` |
| PDF 输出 | `backend/vrain/books_mr/gy_{draftId}/gy_{draftId}_vrain.pdf` |
---

## 2026-05-24 补充：出版工作室开发踩坑

### 坑 6：PDFBox 版本选择与 API 变更

**现象**：使用 PDFBox 2.0.29 渲染 vRain 生成的 PDF 时，非 `mr_5` 模板的页面出现空白图像或 `Format 14 cmap table is not supported` 警告。

**根因**：
- vRain 使用 39MB 的 `qiji-combo.ttf` 字体，其中包含 Format 14 cmap table（Unicode Variation Sequences）
- PDFBox 2.x 对 CJK 字体支持有限，2.0.29 虽然比早期版本好，但仍无法处理部分字体表
- 升级到 PDFBox 3.0.4 可获得更好的 CJK 字体兼容性

**API 变更**（2.x → 3.x）：
```java
// PDFBox 2.x
PDDocument.load(file);

// PDFBox 3.x
Loader.loadPDF(file);  // 需要 import org.apache.pdfbox.Loader;
```

**教训**：
- PDFBox 3.x 的 CJK 字体支持显著优于 2.x
- 如果之前用了 3.0.3 但有问题，应尝试最新版（3.0.4+）而非降级到 2.x
- `fontbox` 在 3.x 中作为传递依赖自动包含，无需单独声明

### 坑 7：PowerShell 编码破坏

**现象**：使用 `Set-Content` 或 `Out-File -NoNewline` 写入 Java/Vue 文件后，中文字符变成乱码（`�`），导致编译错误。

**根因**：
- PowerShell 的 `Set-Content` 默认使用 UTF-16 LE 或系统代码页编码，而非 UTF-8
- `Out-File -NoNewline` 会将所有换行符合并成单行
- `[regex]::Escape()` 在匹配含中文的文本块时容易匹配失败

**正确做法**：
```powershell
# 读取
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# 修改后写入（无 BOM）
[System.IO.File]::WriteAllBytes($file, [System.Text.Encoding]::UTF8.GetBytes($content))

# 或使用 Out-File（保留换行，不带 -NoNewline）
git show HEAD:path/to/file | Out-File -FilePath $dest -Encoding utf8
```

**备份方案**：修改前先用 `git stash` 或手动备份原文件。如果 git checkout 被锁，可用 `git show HEAD:path > file` 恢复。

### 坑 8：模板切换需要 canvasId 全链路传递

**现象**：前端切换模板后，预览/导出的 PDF 仍然是默认模板样式。

**根因**：canvasId 需要在以下链路中完整传递：
```
前端 canvasId → API ?canvasId= → VrainExportService.exportPdf(draftId, canvasId)
  → generateBookCfg(draft, canvasId) → 读取 canvas/{canvasId}.cfg
  → 动态设置 multirows_horizontal_layout 和 row_num
```

**修改清单**：
1. `publishing.ts`：`generatePreview(draftId, canvasId)` 添加 canvasId 参数
2. `PublishingController.java`：`POST /preview?canvasId=` 接收参数
3. `VrainExportService.java`：
   - 添加 `exportPdf(Long, String)` 重载
   - 添加 `generateBookCfg(BookDraft, String)` 重载
   - 读取 `canvas/{id}.cfg` 获取 `if_multirows` 和 `multirows_num`
   - 动态计算 `row_num`：非多栏=35，多栏=(35/栏数)*栏数

### 坑 9：Git index.lock 被 Java 进程占用

**现象**：`git checkout` 始终报 `Unable to create '.git/index.lock': Permission denied`。

**根因**：后台运行的 Java 进程（Spring Boot 后端）可能持有文件句柄。

**解决**：
```powershell
# 强制停止所有 Java 进程
Get-Process -Name java | Stop-Process -Force

# 清理残留锁文件
Remove-Item -Force .git/index.lock -ErrorAction SilentlyContinue
```

**替代方案**：当 git checkout 不可用时，使用 `git show <commit>:<path>` 获取文件内容并手动写入。

### 坑 10：PublishingStudio.vue 的 EntryEditor 集成

**常见遗漏**：
- `StudioToolbar` 缺少 `:editorOpen="editorOpen"` 和 `@toggleEditor="toggleEditor"` 属性
- `<EntryEditor>` 组件未在模板中渲染
- `handleUpdateEntry`、`handleMoveEntry`、`handleDeleteEntry`、`handleMoveToPage`、`handleSaveAndRelayout` 等处理函数未定义

**完整集成清单**：
```vue
<!-- StudioToolbar 需要传递 -->
<StudioToolbar
  :editorOpen="editorOpen"
  @toggleEditor="toggleEditor"
  ...
/>

<!-- EntryEditor 放在 studio-body 内 -->
<EntryEditor
  :open="editorOpen"
  :pageData="currentPageData"
  :pageNumber="currentPage"
  :totalPages="totalPages"
  @close="editorOpen = false"
  @updateEntry="handleUpdateEntry"
  @moveEntry="handleMoveEntry"
  @deleteEntry="handleDeleteEntry"
  @moveToPage="handleMoveToPage"
  @saveAndRelayout="handleSaveAndRelayout"
/>
```

### 当前已知限制

- **模板渲染**：PDFBox 3.0.4 可能无法完美渲染所有 12 个 vRain 模板（部分模板使用特殊颜色/纹理），如遇空白页可考虑：
  1. 安装 Ghostscript 替代 PDFBox 做 PDF→图像转换
  2. 使用 ImageMagick (`magick convert`)
  3. 让 vRain 直接输出图像而非 PDF
- **字体**：`qiji-combo.ttf` (39MB) 的 Format 14 cmap table 警告在 PDFBox 3.x 中已降级为可忽略警告，不影响基本渲染