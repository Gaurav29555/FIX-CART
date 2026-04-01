package com.fixcart.platform.booking;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRequestRepository extends JpaRepository<BookingRequestEntity, UUID> {
    List<BookingRequestEntity> findByCustomerIdOrderByCreatedAtDesc(UUID customerId);
    List<BookingRequestEntity> findByWorkerProfileIdOrderByCreatedAtDesc(UUID workerProfileId);
    List<BookingRequestEntity> findByStatusInOrderByCreatedAtDesc(List<BookingStatus> statuses);
}
