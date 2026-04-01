package com.fixcart.platform.recommendation;

import com.fixcart.platform.booking.BookingRequestEntity;
import com.fixcart.platform.worker.GeoUtils;
import com.fixcart.platform.worker.WorkerProfile;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RecommendationService {

    public List<WorkerRecommendation> rankWorkers(BookingRequestEntity booking, List<WorkerProfile> candidates) {
        return candidates.stream()
                .map(worker -> {
                    double distance = GeoUtils.distanceKm(
                            booking.getLatitude(),
                            booking.getLongitude(),
                            worker.getLatitude(),
                            worker.getLongitude()
                    );
                    double priceScore = worker.getBasePrice() == null ? 0.4
                            : Math.max(0.0, 1.0 - Math.abs(worker.getBasePrice().doubleValue() - booking.getBudget().doubleValue())
                            / Math.max(booking.getBudget().doubleValue(), 1.0));
                    double distanceScore = Math.max(0.0, 1.0 - (distance / Math.max(worker.getServiceRadiusKm() == null ? 20.0 : worker.getServiceRadiusKm(), 1.0)));
                    double ratingScore = worker.getRating() / 5.0;
                    double experienceScore = Math.min(worker.getExperienceYears() == null ? 0 : worker.getExperienceYears(), 15) / 15.0;
                    double completionScore = worker.getAcceptedJobs() == 0 ? 0.5
                            : Math.min(1.0, (double) worker.getCompletedJobs() / worker.getAcceptedJobs());
                    double totalScore = priceScore * 0.25 + distanceScore * 0.25 + ratingScore * 0.2
                            + experienceScore * 0.15 + completionScore * 0.15;
                    String explanation = "Matched on service, distance " + Math.round(distance * 10) / 10.0
                            + " km, rating " + String.format("%.1f", worker.getRating())
                            + ", and budget fit score " + String.format("%.0f", priceScore * 100) + "%.";
                    return new WorkerRecommendation(worker, distance, totalScore, explanation);
                })
                .sorted(Comparator.comparing(WorkerRecommendation::score).reversed())
                .toList();
    }

    public record WorkerRecommendation(
            WorkerProfile worker,
            double distanceKm,
            double score,
            String explanation
    ) {}
}
