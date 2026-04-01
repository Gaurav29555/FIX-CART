package com.fixcart.platform.favorite;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteWorkerRepository extends JpaRepository<FavoriteWorker, UUID> {
    List<FavoriteWorker> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    Optional<FavoriteWorker> findByCustomerIdAndWorkerProfileId(UUID customerId, UUID workerProfileId);
    void deleteByCustomerIdAndWorkerProfileId(UUID customerId, UUID workerProfileId);
}
