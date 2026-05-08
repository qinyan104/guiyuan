package com.genealogy.server.search;

import com.genealogy.server.dto.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public ApiResponse<SearchResult> search(
            @RequestParam("q") String query,
            Authentication authentication) {
        if (query == null || query.trim().isEmpty()) {
            return ApiResponse.success("", new SearchResult(List.of(), List.of()));
        }
        String username = authentication.getName();
        SearchResult result = searchService.search(query.trim(), username);
        return ApiResponse.success("", result);
    }
}
