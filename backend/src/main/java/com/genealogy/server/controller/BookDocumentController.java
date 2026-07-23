package com.genealogy.server.controller;

import com.genealogy.server.auth.AccessPermission;
import com.genealogy.server.auth.UserSubject;
import com.genealogy.server.dto.ApiResponse;
import com.genealogy.server.dto.BookDocumentRequest;
import com.genealogy.server.dto.BookDocumentResponse;
import com.genealogy.server.exception.ForbiddenException;
import com.genealogy.server.model.User;
import com.genealogy.server.repository.UserRepository;
import com.genealogy.server.service.BookDocumentService;
import com.genealogy.server.service.PublicationAuthorizationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/book-documents")
public class BookDocumentController {
    private final BookDocumentService service;
    private final UserRepository userRepository;
    private final PublicationAuthorizationService authorizationService;

    public BookDocumentController(BookDocumentService service,
                                  UserRepository userRepository,
                                  PublicationAuthorizationService authorizationService) {
        this.service = service;
        this.userRepository = userRepository;
        this.authorizationService = authorizationService;
    }

    @GetMapping("/publication/{publicationId}")
    public ApiResponse<BookDocumentResponse> getLatest(@PathVariable Long publicationId, HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, publicationId, AccessPermission.READ_FULL);
        return ApiResponse.success(service.getLatest(publicationId));
    }

    @PutMapping("/publication/{publicationId}")
    public ApiResponse<BookDocumentResponse> save(@PathVariable Long publicationId,
                                                  @RequestBody BookDocumentRequest body,
                                                  HttpServletRequest request) {
        UserSubject subject = resolveSubject(request);
        authorizationService.require(subject, publicationId, AccessPermission.EDIT);
        if (body.getDocumentJson() == null || body.getDocumentJson().isBlank()) {
            return ApiResponse.error(400, "书稿内容不能为空");
        }
        return ApiResponse.success("书稿已保存", service.save(publicationId, subject.getUserId(), body));
    }

    private UserSubject resolveSubject(HttpServletRequest request) {
        String username = (String) request.getAttribute("currentUsername");
        if (username == null) throw new ForbiddenException("未登录");
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ForbiddenException("未登录"));
        return new UserSubject(user.getId(), user.getRole(), user.getUsername());
    }
}
