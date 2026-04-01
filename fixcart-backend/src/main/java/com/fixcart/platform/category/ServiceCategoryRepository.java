package com.fixcart.platform.category;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, UUID> {
    List<ServiceCategory> findByActiveTrueOrderByNameAsc();
    Optional<ServiceCategory> findByCodeIgnoreCase(String code);
}
