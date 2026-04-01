package com.fixcart.platform.worker;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvailabilitySlotRepository extends JpaRepository<AvailabilitySlot, UUID> {
    List<AvailabilitySlot> findByWorkerProfileIdOrderByDayOfWeekAscStartTimeAsc(UUID workerProfileId);
    void deleteByWorkerProfileId(UUID workerProfileId);
}
