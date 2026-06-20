package com.genealogy.server.gedcom;

import com.genealogy.server.service.PublicationService;
import com.genealogy.server.types.PublicationData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Map;

/**
 * GEDCOM 导出服务
 *
 * 从现有族谱数据生成 GEDCOM 文本
 */
@Service
public class GedcomExportService {

    private static final Logger log = LoggerFactory.getLogger(GedcomExportService.class);

    private final GedcomExporter exporter = new GedcomExporter();
    private final PublicationService publicationService;

    public GedcomExportService(PublicationService publicationService) {
        this.publicationService = publicationService;
    }

    /**
     * 将指定族谱导出为 GEDCOM 格式
     *
     * @param pubId 族谱 ID
     * @param output 输出流（通常来自 HttpServletResponse）
     */
    public void export(Long pubId, OutputStream output) throws IOException {
        Map<String, Object> data = publicationService.loadPublication(pubId);

        @SuppressWarnings("unchecked")
        Map<String, Object> pubJson = (Map<String, Object>) data.get("publication");
        PublicationData publicationData = PublicationData.fromMap(pubJson);

        exporter.export(publicationData, output);

        log.info("GEDCOM 导出完成: pubId={}, {} 人, {} 家庭",
            pubId, publicationData.people().size(), publicationData.families().size());
    }
}
