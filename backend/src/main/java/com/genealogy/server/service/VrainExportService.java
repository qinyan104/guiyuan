package com.genealogy.server.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/**
 * PDF export via pdf-lib (Node.js).
 *
 * Pipeline: frontend ComposedPage[] JSON → pdf-export.js → PDF
 */
@Service
public class VrainExportService {

    private static final Logger log = LoggerFactory.getLogger(VrainExportService.class);
    private static final Path VRAIN_DIR = Path.of("vrain_py").toAbsolutePath();

    /**
     * Export PDF from pre-composed page data (ComposedPage[] JSON).
     */
    public Path exportPdfFromJson(String pagesJson, Long draftId) {
        String bookId = "gy_" + draftId;
        Path bookDir = VRAIN_DIR.resolve("books").resolve(bookId);
        Path inputJson = bookDir.resolve("input.json");
        Path outputPdf = bookDir.resolve("output.pdf");

        try {
            Files.createDirectories(bookDir);
            Files.writeString(inputJson, "{\"pages\":" + pagesJson + "}", StandardCharsets.UTF_8);
            return runPdfExport(inputJson, outputPdf);
        } catch (IOException e) {
            log.error("PDF export failed for draft {}", draftId, e);
            throw new RuntimeException("导出失败: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("进程被中断", e);
        }
    }

    private static String findNode() {
        String[] candidates = { "node", "nodejs" };
        for (String c : candidates) {
            try {
                Process p = new ProcessBuilder(c, "--version").start();
                if (p.waitFor(2, TimeUnit.SECONDS) && p.exitValue() == 0) return c;
            } catch (Exception ignored) {}
        }
        return "node";
    }

    private Path runPdfExport(Path inputJson, Path outputPdf) throws IOException, InterruptedException {
        Path script = VRAIN_DIR.resolve("pdf-export.js");
        Path fontPath = VRAIN_DIR.resolve("fonts").resolve("qiji-combo.ttf");

        if (!Files.exists(script)) {
            throw new RuntimeException("导出脚本未找到: " + script);
        }

        String nodeExe = findNode();
        log.info("Using node: {}", nodeExe);

        ProcessBuilder pb = new ProcessBuilder(
            nodeExe, script.toString(),
            inputJson.toString(), outputPdf.toString(), fontPath.toString()
        );
        pb.directory(VRAIN_DIR.toFile());
        pb.redirectErrorStream(true);

        log.info("Running pdf-export: node pdf-export.js {} {}", inputJson, outputPdf);
        Process process = pb.start();

        String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        log.info("pdf-export output:\n{}", output);

        boolean finished = process.waitFor(120, TimeUnit.SECONDS);
        if (!finished) { process.destroyForcibly(); throw new RuntimeException("PDF export timeout"); }
        if (process.exitValue() != 0) { throw new RuntimeException("PDF export failed: " + output); }
        if (!Files.exists(outputPdf) || Files.size(outputPdf) == 0) {
            throw new RuntimeException("PDF file not found: " + outputPdf);
        }
        return outputPdf;
    }
}
