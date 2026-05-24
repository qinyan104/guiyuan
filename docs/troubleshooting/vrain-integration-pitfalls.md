# vRain 集成踩坑记录

> 日期：2026-05-24
> 状态：已解决，PDF 生成成功

---

## 背景

[vRain](https://github.com/shanleiguang/vRain) 是一个 Perl 编写的中文古籍刻本 PDF 生成工具。我们用它作为归源的 PDF 导出引擎。

## 踩坑清单

### 坑 1：Java ProcessBuilder 找不到 perl

**现象**：`CreateProcess error=2, 系统找不到指定的文件`

**根因**：Java `ProcessBuilder` 不继承 Windows 系统 PATH，即使 Strawberry Perl 已安装。

**解决**：通过 `cmd.exe /c where perl` 获取 perl 完整路径，再检查常见安装位置作为兜底。

```java
// VrainExportService.findPerl()
1. cmd.exe /c where perl  → 自动发现
2. 常见路径枚举（如 D:\code_tools\strawberry-perl-xxx\perl\bin\perl.exe）
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