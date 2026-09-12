package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.CurrentUserResolver;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.config.WebConfig;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.UploadedFile;
import com.genealogy.server.repository.UploadedFileRepository;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.security.JwtService;
import com.genealogy.server.service.PublicationAuthorizationService;
import com.genealogy.server.service.RefreshTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FileController.class,
            excludeAutoConfiguration = SecurityAutoConfiguration.class)
@Import(WebConfig.class)
@WithMockUser
@TestPropertySource(properties = "app.upload.max-file-size-bytes=1048576")
public class FileControllerTest {

    @TempDir
    static Path uploadDir;

    @DynamicPropertySource
    static void uploadProperties(DynamicPropertyRegistry registry) {
        registry.add("app.upload.dir", () -> uploadDir.toString());
    }

    private static byte[] validImage(String format) throws Exception {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, format, output);
        return output.toByteArray();
    }

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JwtService jwtService;

    @MockBean
    private RefreshTokenService refreshTokenService;

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private UploadedFileRepository uploadedFileRepository;

    @MockBean
    private CurrentUserResolver currentUserResolver;

    @MockBean
    private PublicationAuthorizationService authorizationService;

    @BeforeEach
    void setUp() throws IOException {
        if (Files.exists(uploadDir) && !Files.isDirectory(uploadDir)) {
            Files.delete(uploadDir);
        }
        Files.createDirectories(uploadDir);
        try (var entries = Files.list(uploadDir)) {
            for (Path path : entries.toList()) {
                Files.deleteIfExists(path);
            }
        }
        when(currentUserResolver.requireUserId(any())).thenReturn(1L);
        when(currentUserResolver.requireSubject(any())).thenReturn(new UserSubject(1L, "USER", "testuser"));
        when(uploadedFileRepository.save(any(UploadedFile.class))).thenAnswer(invocation -> {
            UploadedFile file = invocation.getArgument(0);
            file.setId(1L);
            return file;
        });
    }

    @Test
    public void testUploadFileSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", validImage("jpg"));

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("上传成功"))
                .andExpect(jsonPath("$.data").isString());

        ArgumentCaptor<UploadedFile> uploadedFile = ArgumentCaptor.forClass(UploadedFile.class);
        verify(uploadedFileRepository).save(uploadedFile.capture());
        assertThat(uploadedFile.getValue().getOwnerUserId()).isEqualTo(1L);
        assertThat(uploadedFile.getValue().getPublicationId()).isNull();
        verifyNoInteractions(authorizationService);
        assertThat(uploadFileCount()).isEqualTo(1);
    }

    @Test
    void publicationUploadChecksEditPermissionBeforeWritingFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", validImage("jpg"));
        doThrow(new ForbiddenException("没有权限访问该族谱"))
                .when(authorizationService).require(any(), eq(99L), eq(AccessPermission.EDIT));
        Files.delete(uploadDir);

        mockMvc.perform(multipart("/api/upload")
                        .file(file)
                        .param("publicationId", "99")
                        .requestAttr("currentUsername", "testuser"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));

        verify(uploadedFileRepository, never()).save(any());
        assertThat(uploadDir).doesNotExist();
    }

    @Test
    void repositoryFailureDeletesCopiedFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", validImage("jpg"));
        when(uploadedFileRepository.save(any(UploadedFile.class)))
                .thenThrow(new IllegalStateException("database unavailable"));
        Path sentinel = uploadDir.resolve("existing-file.jpg");
        Files.writeString(sentinel, "existing content");

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(500));

        assertThat(uploadFileCount()).isEqualTo(1);
        assertThat(sentinel).hasContent("existing content");
    }

    @Test
    void fileCopyFailureDoesNotPersistMetadata() throws Exception {
        byte[] image = validImage("jpg");
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", image) {
            @Override
            public InputStream getInputStream() {
                return new InputStream() {
                    private int index;

                    @Override
                    public int read() throws IOException {
                        if (index >= image.length / 2) {
                            throw new IOException("simulated interrupted upload");
                        }
                        return image[index++] & 0xff;
                    }
                };
            }
        };

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value("文件上传失败，请稍后重试"));

        verify(uploadedFileRepository, never()).save(any());
        assertThat(uploadFileCount()).isZero();
    }

    @Test
    void publicationUploadPersistsOwnerAndPublication() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "image/jpeg", validImage("jpg"));

        mockMvc.perform(multipart("/api/upload")
                        .file(file)
                        .param("publicationId", "42")
                        .requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200));

        verify(authorizationService).require(any(), eq(42L), eq(AccessPermission.EDIT));
        ArgumentCaptor<UploadedFile> uploadedFile = ArgumentCaptor.forClass(UploadedFile.class);
        verify(uploadedFileRepository).save(uploadedFile.capture());
        assertThat(uploadedFile.getValue().getOwnerUserId()).isEqualTo(1L);
        assertThat(uploadedFile.getValue().getPublicationId()).isEqualTo(42L);
        assertThat(uploadFileCount()).isEqualTo(1);
    }

    @Test
    public void testUploadFileEmpty() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "empty.jpg", "image/jpeg", new byte[0]);

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value("文件不能为空"));
    }

    @Test
    public void testUploadFileInvalidExtension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.txt", "text/plain", new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("不支持的文件类型")));
    }

    @Test
    public void testUploadFileInvalidMimeType() throws Exception {
        // Valid extension (.jpg) but invalid MIME type
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.jpg", "application/octet-stream", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("不支持的文件格式")));
    }

    @Test
    public void testUploadFileTooLarge() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.jpg", "image/jpeg", new byte[1048577]);

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(500))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("文件大小不能超过")));
    }

    @Test
    public void testUploadPdfFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "document.pdf", "application/pdf", "%PDF-1.7".getBytes());

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("上传成功"));
    }

    private long uploadFileCount() throws IOException {
        try (var entries = Files.list(uploadDir)) {
            return entries.count();
        }
    }

    @Test
    public void testUploadPngFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", validImage("png"));

        mockMvc.perform(multipart("/api/upload").file(file).requestAttr("currentUsername", "testuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(200))
                .andExpect(jsonPath("$.message").value("上传成功"));
    }
}
