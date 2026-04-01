package com.fixcart.platform.category;

import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final ServiceCategoryRepository categoryRepository;

    public CategoryController(ServiceCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categoryRepository.findByActiveTrueOrderByNameAsc()
                .stream()
                .map(category -> new CategoryResponse(category.getId(), category.getCode(), category.getName(), category.getIcon()))
                .toList();
    }

    public record CategoryResponse(UUID id, String code, String name, String icon) {}
}
