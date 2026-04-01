package com.fixcart.platform.worker;

import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class WorkerMapper {

    public WorkerDtos.WorkerCardResponse toCard(WorkerProfile profile, Double distanceKm) {
        return toCard(profile, distanceKm, null, null);
    }

    public WorkerDtos.WorkerCardResponse toCard(
            WorkerProfile profile,
            Double distanceKm,
            Double recommendationScore,
            String recommendationExplanation
    ) {
        return new WorkerDtos.WorkerCardResponse(
                profile.getId(),
                profile.getUser().getId(),
                profile.getUser().getFirstName() + " " + profile.getUser().getLastName(),
                profile.getPrimaryCategory() == null ? null : profile.getPrimaryCategory().getName(),
                profile.getBio(),
                profile.getExperienceYears(),
                profile.getBasePrice(),
                profile.getHourlyRate(),
                profile.getRating(),
                profile.getTotalReviews(),
                profile.getLatitude(),
                profile.getLongitude(),
                distanceKm,
                profile.getServiceRadiusKm(),
                profile.isAvailable(),
                recommendationScore,
                recommendationExplanation
        );
    }

    public WorkerDtos.WorkerProfileResponse toProfile(WorkerProfile profile, Double distanceKm, List<AvailabilitySlot> slots) {
        return new WorkerDtos.WorkerProfileResponse(
                toCard(profile, distanceKm),
                slots.stream()
                        .map(slot -> new WorkerDtos.AvailabilityView(slot.getId(), slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime()))
                        .toList()
        );
    }
}
