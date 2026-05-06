package com.genealogy.server.service;

import com.genealogy.server.dto.PdfExportRequest;
import com.genealogy.server.model.Photo;
import com.genealogy.server.repository.PhotoRepository;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.font.FontProvider;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.svg.converter.SvgConverter;
import com.itextpdf.svg.processors.impl.SvgConverterProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PdfExportService {
    private static final Logger logger = LoggerFactory.getLogger(PdfExportService.class);
    private static final float MAX_PDF_PAGE_EDGE = 14400f;
    private static final Pattern PHOTO_URL_PATTERN = Pattern.compile("(?:https?://[^\"'\\s>]+)?/api/photos/(\\d+)");
    private static final List<String> COMMON_FONT_PATHS = List.of(
            "C:/Windows/Fonts/msyh.ttc",
            "C:/Windows/Fonts/msyhbd.ttc",
            "C:/Windows/Fonts/simsun.ttc",
            "C:/Windows/Fonts/simkai.ttf",
            "C:/Windows/Fonts/simhei.ttf",
            "/System/Library/Fonts/PingFang.ttc",
            "/System/Library/Fonts/STHeiti Medium.ttc",
            "/System/Library/Fonts/Supplemental/Songti.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
    );
    private final PhotoRepository photoRepository;

    @Autowired
    public PdfExportService(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    PdfExportService() {
        this.photoRepository = null;
    }

    public byte[] generateGenealogyBook(String publicationId, PdfExportRequest request) {
        return generateGenealogyBook(publicationId, request, null);
    }

    public byte[] generateGenealogyBook(String publicationId, PdfExportRequest request, String baseUri) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf, PageSize.A4);

            document.add(new Paragraph(request.getTitle() != null ? request.getTitle() : "家族族谱")
                    .setFontSize(36)
                    .setMarginTop(200)
                    .setTextAlignment(TextAlignment.CENTER));

            document.add(new Paragraph("世系记录与成员志")
                    .setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER));

            document.add(new AreaBreak());

            if (request.getPrefaceText() != null && !request.getPrefaceText().isEmpty()) {
                document.add(new Paragraph("家族简介 / 前言")
                        .setFontSize(20)
                        .setBold()
                        .setMarginBottom(20));

                document.add(new Paragraph(request.getPrefaceText())
                        .setMultipliedLeading(1.5f));

                document.add(new AreaBreak());
            }

            if (request.getBiosText() != null && !request.getBiosText().isEmpty()) {
                document.add(new Paragraph("家族成员志")
                        .setFontSize(20)
                        .setBold()
                        .setMarginBottom(20));

                document.add(new Paragraph(request.getBiosText())
                        .setMultipliedLeading(1.2f));

                document.add(new AreaBreak());
            }

            if (request.getSvgMarkup() != null && !request.getSvgMarkup().isEmpty()) {
                renderSvgTree(pdf, document, inlinePhotoUrls(request.getSvgMarkup()), baseUri);
            } else if (request.getBase64Image() != null && !request.getBase64Image().isEmpty()) {
                renderImageTree(document, request.getBase64Image());
            }

            document.close();
        } catch (Exception e) {
            throw new RuntimeException("Error generating PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    public byte[] generateSinglePageSvgPdf(PdfExportRequest request) {
        return generateSinglePageSvgPdf(request, null);
    }

    public byte[] generateSinglePageSvgPdf(PdfExportRequest request, String baseUri) {
        logger.info("Generating single page PDF. SVG length: {}, Width: {}, Height: {}",
                request.getSvgMarkup() != null ? request.getSvgMarkup().length() : 0,
                request.getPdfWidth(), request.getPdfHeight());

        if (request.getSvgMarkup() == null || request.getSvgMarkup().isEmpty()) {
            throw new RuntimeException("Single-page PDF export requires standalone SVG markup");
        }

        float width = request.getPdfWidth() != null ? request.getPdfWidth() : PageSize.A4.getWidth();
        float height = request.getPdfHeight() != null ? request.getPdfHeight() : PageSize.A4.getHeight();

        if (width <= 0 || height <= 0) {
            logger.warn("Invalid dimensions: {}x{}. Falling back to A4.", width, height);
            width = PageSize.A4.getWidth();
            height = PageSize.A4.getHeight();
        }

        float scale = Math.min(1f, Math.min(MAX_PDF_PAGE_EDGE / width, MAX_PDF_PAGE_EDGE / height));
        if (scale < 1f) {
            logger.info("Scaling oversized single-page PDF from {}x{}pt to {}x{}pt.", width, height, width * scale, height * scale);
            width *= scale;
            height *= scale;
        }

        String svgMarkup = retargetSvgMarkupToPage(inlinePhotoUrls(request.getSvgMarkup()), width, height);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try (PdfWriter writer = new PdfWriter(baos); PdfDocument pdf = new PdfDocument(writer)) {
            PdfPage page = pdf.addNewPage(new PageSize(width, height));
            SvgConverter.drawOnPage(svgMarkup, page, createSvgConverterProperties(baseUri));
        } catch (Exception e) {
            logger.error("Error generating single page PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Error generating single page PDF: " + e.getMessage(), e);
        }

        return baos.toByteArray();
    }

    private void renderSvgTree(PdfDocument pdf, Document document, String svgMarkup, String baseUri) {
        try {
            pdf.setDefaultPageSize(PageSize.A4.rotate());
            document.add(new AreaBreak());
            document.add(new Paragraph("世系全图（矢量）").setFontSize(14).setBold().setMarginBottom(10));

            SvgConverterProperties props = createSvgConverterProperties(baseUri);
            ByteArrayInputStream bais = new ByteArrayInputStream(svgMarkup.getBytes(StandardCharsets.UTF_8));
            Image svgImage = SvgConverter.convertToImage(bais, pdf, props);

            float pageWidth = pdf.getDefaultPageSize().getWidth() - document.getLeftMargin() - document.getRightMargin();
            svgImage.scaleToFit(pageWidth, 1_000_000);

            document.add(svgImage);
        } catch (Exception e) {
            logger.error("SVG rendering failed for book export: {}", e.getMessage(), e);
            document.add(new Paragraph("世系图渲染失败，请检查 SVG 格式。"));
        }
    }

    private void renderImageTree(Document document, String base64Image) throws Exception {
        String b64 = base64Image;
        if (b64.contains(",")) {
            b64 = b64.split(",")[1];
        }

        byte[] imageBytes = Base64.getDecoder().decode(b64);
        BufferedImage fullImg = ImageIO.read(new ByteArrayInputStream(imageBytes));

        if (fullImg != null) {
            float pdfWidth = PageSize.A4.getWidth() - document.getLeftMargin() - document.getRightMargin();
            float pdfHeight = PageSize.A4.getHeight() - document.getTopMargin() - document.getBottomMargin();

            int imgWidth = fullImg.getWidth();
            int imgHeight = fullImg.getHeight();

            float scaleRatio = pdfWidth / imgWidth;
            int slicePixelHeight = (int) (pdfHeight / scaleRatio);

            int yOffset = 0;
            int overlapPixels = 80;

            while (yOffset < imgHeight) {
                int h = Math.min(slicePixelHeight, imgHeight - yOffset);
                if (h <= 0) {
                    break;
                }

                BufferedImage slice = fullImg.getSubimage(0, yOffset, imgWidth, h);
                ByteArrayOutputStream sliceBaos = new ByteArrayOutputStream();
                ImageIO.write(slice, "png", sliceBaos);

                ImageData data = ImageDataFactory.create(sliceBaos.toByteArray());
                Image pdfImage = new Image(data);
                pdfImage.scaleToFit(pdfWidth, pdfHeight);

                document.add(new Paragraph("世系图（续）").setFontSize(10).setItalic());
                document.add(pdfImage);

                yOffset += (slicePixelHeight - overlapPixels);
                if (yOffset < imgHeight) {
                    document.add(new AreaBreak());
                }
            }
        }
    }

    private SvgConverterProperties createSvgConverterProperties(String baseUri) {
        FontProvider fontProvider = new FontProvider();
        fontProvider.addStandardPdfFonts();
        fontProvider.addSystemFonts();

        for (String fontPath : COMMON_FONT_PATHS) {
            if (Files.exists(Path.of(fontPath))) {
                fontProvider.addFont(fontPath);
            }
        }

        SvgConverterProperties props = new SvgConverterProperties();
        props.setFontProvider(fontProvider);
        if (baseUri != null && !baseUri.isBlank()) {
            props.setBaseUri(baseUri);
        }
        return props;
    }

    String inlinePhotoUrls(String svgMarkup) {
        if (photoRepository == null || svgMarkup == null || svgMarkup.isBlank()) {
            return svgMarkup;
        }

        Matcher matcher = PHOTO_URL_PATTERN.matcher(svgMarkup);
        Map<Long, String> inlinedPhotoUrls = new HashMap<>();
        StringBuffer output = new StringBuffer();

        while (matcher.find()) {
            Long photoId = Long.parseLong(matcher.group(1));
            String replacement = inlinedPhotoUrls.computeIfAbsent(photoId, this::resolvePhotoDataUrl);
            matcher.appendReplacement(output, Matcher.quoteReplacement(replacement));
        }

        matcher.appendTail(output);
        return output.toString();
    }

    private String resolvePhotoDataUrl(Long photoId) {
        return photoRepository.findById(photoId)
                .map(this::toDataUrl)
                .orElse("/api/photos/" + photoId);
    }

    private String toDataUrl(Photo photo) {
        return "data:" + photo.getMimeType() + ";base64," + Base64.getEncoder().encodeToString(photo.getData());
    }

    private String retargetSvgMarkupToPage(String svgMarkup, float width, float height) {
        String rootTag = svgMarkup.replaceFirst("(?is).*?(<svg\\b[^>]*>).*", "$1");
        if (rootTag.equals(svgMarkup)) {
            return svgMarkup;
        }

        String nextRootTag = upsertSvgRootAttribute(rootTag, "width", trimTrailingZeros(width) + "pt");
        nextRootTag = upsertSvgRootAttribute(nextRootTag, "height", trimTrailingZeros(height) + "pt");
        nextRootTag = upsertSvgRootAttribute(nextRootTag, "preserveAspectRatio", "xMidYMid meet");
        return svgMarkup.replace(rootTag, nextRootTag);
    }

    private String upsertSvgRootAttribute(String rootTag, String attributeName, String value) {
        String attributePattern = attributeName + "=\"[^\"]*\"";
        if (rootTag.matches("(?is).*\\s" + attributePattern + ".*")) {
            return rootTag.replaceFirst(attributePattern, attributeName + "=\"" + value + "\"");
        }

        return rootTag.replaceFirst("<svg", "<svg " + attributeName + "=\"" + value + "\"");
    }

    private String trimTrailingZeros(float value) {
        String text = Float.toString(value);
        if (text.contains(".") && !text.contains("E") && !text.contains("e")) {
            text = text.replaceAll("0+$", "").replaceAll("\\.$", "");
        }
        return text;
    }
}
