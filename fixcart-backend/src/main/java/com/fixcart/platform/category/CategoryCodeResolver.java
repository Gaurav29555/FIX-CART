package com.fixcart.platform.category;

import jakarta.persistence.EntityNotFoundException;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class CategoryCodeResolver {

    private static final Map<String, String> CATEGORY_ALIASES = Map.ofEntries(
            Map.entry("PLUMBING", "PLUMBING"),
            Map.entry("PLUMBER", "PLUMBING"),
            Map.entry("ELECTRICAL", "ELECTRICAL"),
            Map.entry("ELECTRICIAN", "ELECTRICAL"),
            Map.entry("CARPENTRY", "CARPENTRY"),
            Map.entry("CARPENTER", "CARPENTRY"),
            Map.entry("PAINTING", "PAINTING"),
            Map.entry("PAINTER", "PAINTING"),
            Map.entry("CLEANING", "CLEANING"),
            Map.entry("CLEANER", "CLEANING"),
            Map.entry("HANDYMAN", "HANDYMAN"),
            Map.entry("GARDENING", "GARDENING"),
            Map.entry("GARDENER", "GARDENING"),
            Map.entry("APPLIANCE", "APPLIANCE"),
            Map.entry("APPLIANCE_REPAIR", "APPLIANCE"),
            Map.entry("APPLIANCE_REPAIRING", "APPLIANCE")
    );

    private final ServiceCategoryRepository categoryRepository;

    public CategoryCodeResolver(ServiceCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public ServiceCategory requireCategory(String rawCode) {
        return categoryRepository.findByCodeIgnoreCase(normalize(rawCode))
                .orElseThrow(() -> new EntityNotFoundException("Service category not found"));
    }

    public String normalize(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new EntityNotFoundException("Service category not found");
        }
        String canonical = rawCode.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_");
        return CATEGORY_ALIASES.getOrDefault(canonical, canonical);
    }
}