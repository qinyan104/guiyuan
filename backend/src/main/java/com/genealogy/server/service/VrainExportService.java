package com.genealogy.server.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.genealogy.server.dto.SheetResponse;
import com.genealogy.server.exception.BadRequestException;
import com.genealogy.server.model.BookDraft;
import com.genealogy.server.repository.BookDraftRepository;
import com.genealogy.server.repository.BookSheetRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
public class VrainExportService {

    private static final Logger log = LoggerFactory.getLogger(VrainExportService.class);
    private static final Path VRAIN_DIR = Path.of("vrain").toAbsolutePath();

    private final BookDraftRepository draftRepo;
    private final BookSheetRepository sheetRepo;
    private final PublishingService publishingService;
    private final ObjectMapper objectMapper;

    public VrainExportService(BookDraftRepository draftRepo,
                              BookSheetRepository sheetRepo,
                              PublishingService publishingService,
                              ObjectMapper objectMapper) {
        this.draftRepo = draftRepo;
        this.sheetRepo = sheetRepo;
        this.publishingService = publishingService;
        this.objectMapper = objectMapper;
    }

    /**
     * Generate vRain text from structured lineage data (JSON in sheet layoutData).
     * Expects each sheet's layoutData to be a JSON object with an "entries" array.
     */
    @SuppressWarnings("unchecked")
    public String generateTextFromLineageData(Long draftId) {
        var sheets = sheetRepo.findByDraftIdOrderBySheetNumberAsc(draftId);

        StringBuilder sb = new StringBuilder();
        int lastGen = -1;

        for (var sheet : sheets) {
            String layoutData = sheet.getLayoutData();
            if (layoutData == null || layoutData.isBlank()) continue;

            try {
                Map<String, Object> data = objectMapper.readValue(layoutData, Map.class);
                List<Map<String, Object>> entries = (List<Map<String, Object>>) data.get("entries");
                if (entries == null) continue;

                for (var entry : entries) {
                    int gen = entry.get("generation") != null ? ((Number) entry.get("generation")).intValue() : 0;
                    String text = (String) entry.get("formattedText");
                    String name = (String) entry.get("personName");
                    if (text == null) continue;

                    // Generation header
                    if (gen != lastGen) {
                        String genLabel = toChineseGen(gen + 1);
                        sb.append("@@").append(genLabel).append("\n");
                        lastGen = gen;
                    }

                    // Person name line (for vRain's @ marker)
                    sb.append(name != null ? name : "").append("\n");
                    // Body text
                    sb.append(text).append("\n");
                    sb.append("\n");
                }

                // Page break after each sheet
                sb.append("^\n");

            } catch (IOException e) {
                log.warn("Failed to parse layoutData for sheet {}: {}", sheet.getId(), e.getMessage());
            }
        }

        return sb.toString();
    }

    /**
     * Write vRain project files and run the typesetting engine.
     * Returns the path to the generated PDF.
     */
    public Path exportPdf(Long draftId) {
        BookDraft draft = draftRepo.findById(draftId)
                .orElseThrow(() -> new BadRequestException("草稿不存在"));

        String bookId = "gy_" + draftId;
        Path bookDir = VRAIN_DIR.resolve("books_mr").resolve(bookId);
        Path textDir = bookDir.resolve("text");

        try {
            // Create directory structure
            Files.createDirectories(textDir);

            // Generate text
            String text = generateTextFromLineageData(draftId);
            Files.writeString(textDir.resolve("01.txt"), text, StandardCharsets.UTF_8);

            // Generate book.cfg
            String cfg = generateBookCfg(draft, "mr_5"); // Default for export without canvasId specified
            Files.writeString(bookDir.resolve("book.cfg"), cfg, StandardCharsets.UTF_8);

            // Run vRain
            Path pdfPath = runVrain(bookId);

            return pdfPath;

        } catch (IOException e) {
            log.error("vRain export failed for draft {}", draftId, e);
            throw new RuntimeException("古籍排版导出失败: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("排版进程被中断", e);
        }
    }

    public Path exportPdf(Long draftId, String canvasId) {
        BookDraft draft = draftRepo.findById(draftId)
                .orElseThrow(() -> new BadRequestException("草稿不存在"));

        String bookId = "gy_" + draftId;
        Path bookDir = VRAIN_DIR.resolve("books_mr").resolve(bookId);
        Path textDir = bookDir.resolve("text");

        try {
            Files.createDirectories(textDir);
            String text = generateTextFromLineageData(draftId);
            Files.writeString(textDir.resolve("01.txt"), text, StandardCharsets.UTF_8);
            String cfg = generateBookCfg(draft, canvasId);
            Files.writeString(bookDir.resolve("book.cfg"), cfg, StandardCharsets.UTF_8);
            Path pdfPath = runVrain(bookId);
            return pdfPath;
        } catch (IOException e) {
            log.error("vRain export failed for draft {}", draftId, e);
            throw new RuntimeException("古籍排版导出失败: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("排版进程被中断", e);
        }
    }

    private String generateBookCfg(BookDraft draft, String canvasId) {
        String title = draft.getTitle();
        if (title == null || title.isBlank()) title = "族谱";
        return """
            title=%s
            author=归源族谱管理系统

            canvas_id=%s
            row_num=35
            row_delta_y=8

            multirows_horizontal_layout=1

            if_nocomma=0
            if_onlyperiod=0

            font1=qiji-combo.ttf
            font2=HanaMinA.ttf
            font3=HanaMinB.ttf
            font4=
            font5=
            try_st=0

            font1_rotate=0
            font2_rotate=0
            font3_rotate=0
            font4_rotate=0
            font5_rotate=0

            text_fonts_array=123
            text_font1_size=42
            text_font2_size=38
            text_font3_size=38
            text_font4_size=38
            text_font5_size=38
            text_font_color=black

            comment_fonts_array=12
            comment_font1_size=28
            comment_font2_size=24

            text_comma_90=
            text_comma_nop=
            comment_comma_90=
            comment_comma_nop=

            title_font_size=42
            title_font_color=black
            title_y=1700
            title_ydis=1.2
            if_tpcenter=1

            pager_font_size=24
            pager_font_color=black
            pager_y=100

            if_book_vline=0
            book_line_width=1
            book_line_color=black

            cover_title_font_size=48
            cover_title_y=400
            cover_author_font_size=32
            cover_author_y=200
            cover_font_color=black
            """.formatted(title, canvasId);
    }


    /**
     * Find perl executable. Tries common locations for Strawberry Perl on Windows.
     */
    private static String findPerl() {
        // 1. Check common Strawberry Perl locations first (has PDF::Builder)
        String[] candidates = {
            "D:\\code_tools\\strawberry-perl-5.42.2.1-64bit\\perl\\bin\\perl.exe",
            "C:\\Strawberry\\perl\\bin\\perl.exe",
            "C:\\Strawberry-perl\\perl\\bin\\perl.exe",
        };
        for (String c : candidates) {
            if (java.nio.file.Files.exists(java.nio.file.Path.of(c))) return c;
        }

        // 2. Try PATH via cmd.exe (Git Bash perl may lack PDF::Builder)
        try {
            Process p = new ProcessBuilder("cmd.exe", "/c", "where", "perl").start();
            String out = new String(p.getInputStream().readAllBytes()).trim();
            if (!out.isEmpty() && p.waitFor() == 0) {
                String first = out.lines().findFirst().orElse("");
                if (!first.isEmpty()) return first;
            }
        } catch (Exception ignored) {}

        // 3. Fallback: hope it is on PATH
        return "perl";
    }
    private Path runVrain(String bookId) throws IOException, InterruptedException {
        Path vrainScript = VRAIN_DIR.resolve("vrain_mr.pl");
        Path pdfDir = VRAIN_DIR.resolve("pdf");

        Files.createDirectories(pdfDir);

        String perlExe = findPerl();
        log.info("Using perl: {}", perlExe);

        ProcessBuilder pb = new ProcessBuilder(
            perlExe, vrainScript.toString(),
            "-b", bookId,
            "-f", "1"
        );
        pb.directory(VRAIN_DIR.toFile());

        // Strawberry Perl DLLs need to be on PATH
        String perlBin = java.nio.file.Path.of(perlExe).getParent().toString();
        String perlCBin = java.nio.file.Path.of(perlExe).getParent().getParent().getParent().resolve("c").resolve("bin").toString();
        String currentPath = System.getenv("PATH");
        String newPath = perlBin + ";" + perlCBin + ";" + (currentPath != null ? currentPath : "");
        pb.environment().put("PATH", newPath);
        log.info("vRain PATH: {}", newPath);
        pb.redirectErrorStream(true);

        log.info("Running vRain: perl {} -b {}", vrainScript, bookId);
        Process process = pb.start();

        // Read output
        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        log.info("vRain output:\n{}", output);

        boolean finished = process.waitFor(120, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("vRain 排版超时（120秒）");
        }

        if (process.exitValue() != 0) {
            throw new RuntimeException("vRain 排版失败，exit=" + process.exitValue() + ": " + output);
        }

        // Find generated PDF
        // vRain script generates [bookId]_vrain.pdf
        Path vrainPdf = VRAIN_DIR.resolve("books_mr").resolve(bookId).resolve(bookId + "_vrain.pdf");
        if (Files.exists(vrainPdf)) {
            return vrainPdf;
        }

        Path expectedPdf = VRAIN_DIR.resolve("books_mr").resolve(bookId).resolve(bookId + ".pdf");
        if (Files.exists(expectedPdf)) {
            return expectedPdf;
        }

        // Try glob for PDF
        try (var stream = Files.list(VRAIN_DIR.resolve("books_mr").resolve(bookId))) {
            return stream
                .filter(p -> p.toString().endsWith(".pdf"))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("未找到生成的 PDF 文件"));
        }
    }

    private static String toChineseGen(int n) {
        String[] digits = {"", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"};
        if (n <= 10) return "第" + digits[n] + "代";
        if (n < 20) return "第十" + digits[n - 10] + "代";
        if (n < 100) {
            int tens = n / 10;
            int ones = n % 10;
            return "第" + digits[tens] + "十" + (ones > 0 ? digits[ones] : "") + "代";
        }
        return "第" + n + "代";
    }
}