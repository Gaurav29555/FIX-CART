package com.fixcart.platform.worker;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.auth.UserRole;
import com.fixcart.platform.category.ServiceCategory;
import com.fixcart.platform.category.ServiceCategoryRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class WorkerService {

    private final WorkerProfileRepository workerProfileRepository;
    private final AvailabilitySlotRepository availabilitySlotRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final WorkerMapper workerMapper;

    public WorkerService(
            WorkerProfileRepository workerProfileRepository,
            AvailabilitySlotRepository availabilitySlotRepository,
            ServiceCategoryRepository categoryRepository,
            UserRepository userRepository,
            WorkerMapper workerMapper
    ) {
        this.workerProfileRepository = workerProfileRepository;
        this.availabilitySlotRepository = availabilitySlotRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.workerMapper = workerMapper;
    }

    public WorkerProfile createStarterProfile(User user, String categoryCode, String bio, Integer experienceYears,
                                              BigDecimal basePrice, BigDecimal hourlyRate,
                                              Double latitude, Double longitude, Double serviceRadiusKm) {
        if (user.getRole() != UserRole.WORKER) {
            return null;
        }
        WorkerProfile profile = new WorkerProfile();
        profile.setUser(user);
        profile.setBio(bio);
        profile.setExperienceYears(experienceYears);
        profile.setBasePrice(basePrice);
        profile.setHourlyRate(hourlyRate);
        profile.setLatitude(latitude);
        profile.setLongitude(longitude);
        profile.setServiceRadiusKm(serviceRadiusKm == null ? 15.0 : serviceRadiusKm);
        profile.setAvailable(true);
        if (categoryCode != null) {
            ServiceCategory category = categoryRepository.findByCodeIgnoreCase(categoryCode).orElse(null);
            profile.setPrimaryCategory(category);
        }
        return workerProfileRepository.save(profile);
    }

    public WorkerDtos.WorkerProfileResponse upsert(UUID userId, WorkerDtos.UpsertWorkerProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        if (user.getRole() != UserRole.WORKER) {
            throw new IllegalStateException("Only workers can update worker profile");
        }
        WorkerProfile profile = workerProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    WorkerProfile fresh = new WorkerProfile();
                    fresh.setUser(user);
                    return fresh;
                });
        ServiceCategory category = categoryRepository.findByCodeIgnoreCase(request.primaryCategoryCode())
                .orElseThrow(() -> new EntityNotFoundException("Service category not found"));

        profile.setPrimaryCategory(category);
        profile.setBio(request.bio());
        profile.setExperienceYears(request.experienceYears());
        profile.setBasePrice(request.basePrice());
        profile.setHourlyRate(request.hourlyRate());
        profile.setLatitude(request.latitude());
        profile.setLongitude(request.longitude());
        profile.setServiceRadiusKm(request.serviceRadiusKm());
        profile.setAvailable(request.available());
        WorkerProfile saved = workerProfileRepository.save(profile);

        availabilitySlotRepository.deleteByWorkerProfileId(saved.getId());
        List<AvailabilitySlot> slots = request.availability().stream().map(slotRequest -> {
            AvailabilitySlot slot = new AvailabilitySlot();
            slot.setWorkerProfile(saved);
            slot.setDayOfWeek(slotRequest.dayOfWeek());
            slot.setStartTime(slotRequest.startTime());
            slot.setEndTime(slotRequest.endTime());
            return slot;
        }).toList();
        availabilitySlotRepository.saveAll(slots);

        return workerMapper.toProfile(saved, null, slots);
    }

    @Transactional(readOnly = true)
    public WorkerDtos.WorkerProfileResponse getOwnProfile(UUID userId) {
        WorkerProfile profile = workerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("Worker profile not found"));
        return workerMapper.toProfile(
                profile,
                null,
                availabilitySlotRepository.findByWorkerProfileIdOrderByDayOfWeekAscStartTimeAsc(profile.getId())
        );
    }

    @Transactional(readOnly = true)
    public List<WorkerDtos.WorkerCardResponse> discover(String categoryCode, Double latitude, Double longitude, Double maxBudget) {
        return workerProfileRepository.findByAvailableTrue().stream()
                .filter(profile -> categoryCode == null
                        || (profile.getPrimaryCategory() != null && profile.getPrimaryCategory().getCode().equalsIgnoreCase(categoryCode)))
                .filter(profile -> maxBudget == null || profile.getBasePrice() == null || profile.getBasePrice().doubleValue() <= maxBudget)
                .map(profile -> toDiscoveryCandidate(profile, latitude, longitude, maxBudget))
                .filter(candidate -> candidate.distanceKm() == null
                        || candidate.profile().getServiceRadiusKm() == null
                        || candidate.distanceKm() <= candidate.profile().getServiceRadiusKm())
                .sorted(Comparator.comparing(DiscoveryCandidate::score).reversed())
                .map(candidate -> workerMapper.toCard(
                        candidate.profile(),
                        candidate.distanceKm(),
                        roundScore(candidate.score()),
                        candidate.explanation()
                ))
                .toList();
    }

    public WorkerProfile requireWorkerProfile(UUID userId) {
        return workerProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("Worker profile not found"));
    }

    public WorkerProfile findByWorkerId(UUID workerId) {
        return workerProfileRepository.findById(workerId)
                .orElseThrow(() -> new EntityNotFoundException("Worker not found"));
    }

    private DiscoveryCandidate toDiscoveryCandidate(WorkerProfile profile, Double latitude, Double longitude, Double maxBudget) {
        Double distance = null;
        if (latitude != null && longitude != null && profile.getLatitude() != null && profile.getLongitude() != null) {
            distance = GeoUtils.distanceKm(latitude, longitude, profile.getLatitude(), profile.getLongitude());
        }

        double distanceScore = distance == null ? 0.55
                : Math.max(0.0, 1.0 - (distance / Math.max(profile.getServiceRadiusKm() == null ? 20.0 : profile.getServiceRadiusKm(), 1.0)));
        double ratingValue = profile.getRating() <= 0 ? 4.0 : profile.getRating();
        double ratingScore = ratingValue / 5.0;
        double experienceScore = Math.min(profile.getExperienceYears() == null ? 0 : profile.getExperienceYears(), 15) / 15.0;
        double completionScore = profile.getAcceptedJobs() == 0 ? 0.6
                : Math.min(1.0, (double) profile.getCompletedJobs() / profile.getAcceptedJobs());
        double priceScore = maxBudget == null || profile.getBasePrice() == null ? 0.7
                : Math.max(0.0, 1.0 - Math.abs(profile.getBasePrice().doubleValue() - maxBudget)
                / Math.max(maxBudget, 1.0));

        double totalScore = priceScore * 0.28 + distanceScore * 0.27 + ratingScore * 0.2
                + experienceScore * 0.15 + completionScore * 0.10;

        String distanceText = distance == null ? "location fit available" : String.format("%.1f km away", distance);
        String priceText = maxBudget == null || profile.getBasePrice() == null
                ? "pricing available"
                : profile.getBasePrice().doubleValue() <= maxBudget
                ? "within your budget"
                : "slightly above your budget";
        String explanation = "Recommended because this worker is " + distanceText
                + ", has a " + String.format("%.1f", ratingValue) + "/5 rating"
                + ", charges around Rs " + (profile.getBasePrice() == null ? "N/A" : profile.getBasePrice().toPlainString())
                + ", and is " + priceText + ".";

        return new DiscoveryCandidate(profile, distance, totalScore, explanation);
    }

    private Double roundScore(double score) {
        return Math.round(score * 100.0) / 100.0;
    }

    private record DiscoveryCandidate(WorkerProfile profile, Double distanceKm, double score, String explanation) {}
}

