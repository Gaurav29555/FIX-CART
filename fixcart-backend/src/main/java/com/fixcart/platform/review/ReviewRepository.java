package com.fixcart.platform.review;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    List<Review> findByWorkerProfileIdOrderByCreatedAtDesc(UUID workerProfileId);
    Optional<Review> findByBookingId(UUID bookingId);
}
