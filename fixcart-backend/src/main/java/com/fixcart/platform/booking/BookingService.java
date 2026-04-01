package com.fixcart.platform.booking;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.ai.AiAssistantService;
import com.fixcart.platform.auth.UserRole;
import com.fixcart.platform.category.CategoryCodeResolver;
import com.fixcart.platform.category.ServiceCategory;
import com.fixcart.platform.category.ServiceCategoryRepository;
import com.fixcart.platform.chat.ChatService;
import com.fixcart.platform.notification.NotificationService;
import com.fixcart.platform.recommendation.RecommendationService;
import com.fixcart.platform.worker.WorkerProfile;
import com.fixcart.platform.worker.WorkerProfileRepository;
import com.fixcart.platform.worker.WorkerService;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BookingService {

    private final BookingRequestRepository bookingRepository;
    private final BookingStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final CategoryCodeResolver categoryCodeResolver;
    private final WorkerProfileRepository workerProfileRepository;
    private final RecommendationService recommendationService;
    private final AiAssistantService aiAssistantService;
    private final WorkerService workerService;
    private final ChatService chatService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    public BookingService(
            BookingRequestRepository bookingRepository,
            BookingStatusHistoryRepository historyRepository,
            UserRepository userRepository,
            ServiceCategoryRepository categoryRepository,
            CategoryCodeResolver categoryCodeResolver,
            WorkerProfileRepository workerProfileRepository,
            RecommendationService recommendationService,
            AiAssistantService aiAssistantService,
            WorkerService workerService,
            ChatService chatService,
            NotificationService notificationService,
            SimpMessagingTemplate messagingTemplate
    ) {
        this.bookingRepository = bookingRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.categoryCodeResolver = categoryCodeResolver;
        this.workerProfileRepository = workerProfileRepository;
        this.recommendationService = recommendationService;
        this.aiAssistantService = aiAssistantService;
        this.workerService = workerService;
        this.chatService = chatService;
        this.notificationService = notificationService;
        this.messagingTemplate = messagingTemplate;
    }

    public BookingDtos.BookingResponse createBooking(UUID customerUserId, BookingDtos.CreateBookingRequest request) {
        User customer = userRepository.findById(customerUserId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new IllegalStateException("Only customers can create bookings");
        }
        ServiceCategory category = categoryCodeResolver.requireCategory(request.categoryCode());

        BookingRequestEntity booking = new BookingRequestEntity();
        booking.setCustomer(customer);
        booking.setServiceCategory(category);
        booking.setTitle(request.title());
        booking.setDescription(request.description());
        booking.setBudget(request.budget());
        booking.setExpectedDurationHours(request.expectedDurationHours());
        booking.setPreferredTime(request.preferredTime());
        booking.setAddress(request.address());
        booking.setLatitude(request.latitude());
        booking.setLongitude(request.longitude());
        booking.setUrgency(request.urgency());
        booking.setStatus(BookingStatus.BROADCASTED);

        String resolvedCategoryCode = category.getCode();
        List<WorkerProfile> candidates = workerProfileRepository.findByAvailableTrue().stream()
                .filter(worker -> worker.getPrimaryCategory() != null
                        && worker.getPrimaryCategory().getCode().equalsIgnoreCase(resolvedCategoryCode))
                .filter(worker -> worker.getLatitude() != null && worker.getLongitude() != null)
                .toList();
        BookingRequestEntity saved = bookingRepository.save(booking);
        List<RecommendationService.WorkerRecommendation> ranked = recommendationService.rankWorkers(saved, candidates);
        if (!ranked.isEmpty()) {
            RecommendationService.WorkerRecommendation top = ranked.get(0);
            saved.setMatchExplanation(aiAssistantService.refineMatchExplanation(saved, top.worker(), top.explanation()));
        } else {
            saved.setMatchExplanation("No ranked worker yet. The request is still open to matching providers.");
        }
        saved = bookingRepository.save(saved);
        addHistory(saved, BookingStatus.BROADCASTED, customer, "Request created and broadcast to matching workers.");
        messagingTemplate.convertAndSend("/topic/bookings/open", toResponse(saved));
        return toResponse(saved);
    }

    public BookingDtos.BookingResponse acceptBooking(UUID workerUserId, UUID bookingId) {
        WorkerProfile worker = workerService.requireWorkerProfile(workerUserId);
        BookingRequestEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        if (booking.getWorkerProfile() != null && !booking.getWorkerProfile().getId().equals(worker.getId())) {
            throw new IllegalStateException("Booking is already assigned");
        }
        booking.setWorkerProfile(worker);
        booking.setStatus(BookingStatus.ACCEPTED);
        if (booking.getMatchExplanation() == null || booking.getMatchExplanation().isBlank()) {
            booking.setMatchExplanation("Accepted by a matched provider.");
        }
        worker.setAcceptedJobs(worker.getAcceptedJobs() + 1);
        BookingRequestEntity saved = bookingRepository.save(booking);
        addHistory(saved, BookingStatus.ACCEPTED, worker.getUser(), "Worker accepted the job.");
        chatService.ensureChatRoom(saved);
        BookingDtos.BookingResponse response = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/bookings/" + saved.getId(), response);
        messagingTemplate.convertAndSend("/topic/bookings/open", response);
        notificationService.sendToUser(
                saved.getCustomer().getId(),
                "Worker accepted your request",
                saved.getWorkerProfile().getUser().getFirstName() + " accepted " + saved.getTitle(),
                Map.of("bookingId", saved.getId().toString(), "status", saved.getStatus().name())
        );
        return response;
    }

    public BookingDtos.BookingResponse updateStatus(UUID userId, UUID bookingId, BookingDtos.UpdateStatusRequest request) {
        BookingRequestEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        User actor = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        boolean isCustomer = booking.getCustomer().getId().equals(userId);
        boolean isWorker = booking.getWorkerProfile() != null && booking.getWorkerProfile().getUser().getId().equals(userId);
        if (!isCustomer && !isWorker && actor.getRole() != UserRole.ADMIN) {
            throw new IllegalStateException("You are not allowed to update this booking");
        }

        if (request.status() == BookingStatus.COMPLETED && booking.getWorkerProfile() != null) {
            WorkerProfile worker = booking.getWorkerProfile();
            worker.setCompletedJobs(worker.getCompletedJobs() + 1);
        }
        booking.setStatus(request.status());
        BookingRequestEntity saved = bookingRepository.save(booking);
        addHistory(saved, request.status(), actor, request.note());
        BookingDtos.BookingResponse response = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/bookings/" + saved.getId(), response);
        if (saved.getCustomer() != null) {
            notificationService.sendToUser(
                    saved.getCustomer().getId(),
                    "Booking update",
                    saved.getTitle() + " is now " + saved.getStatus().name().replace("_", " ").toLowerCase(),
                    Map.of("bookingId", saved.getId().toString(), "status", saved.getStatus().name())
            );
        }
        if (saved.getWorkerProfile() != null) {
            notificationService.sendToUser(
                    saved.getWorkerProfile().getUser().getId(),
                    "Booking update",
                    saved.getTitle() + " is now " + saved.getStatus().name().replace("_", " ").toLowerCase(),
                    Map.of("bookingId", saved.getId().toString(), "status", saved.getStatus().name())
            );
        }
        return response;
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingResponse> listForUser(UUID userId, UserRole role) {
        List<BookingRequestEntity> bookings = role == UserRole.WORKER
                ? bookingRepository.findByWorkerProfileIdOrderByCreatedAtDesc(workerService.requireWorkerProfile(userId).getId())
                : bookingRepository.findByCustomerIdOrderByCreatedAtDesc(userId);
        return bookings.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BookingDtos.BookingResponse> listOpenJobsForWorkers() {
        return bookingRepository.findByStatusInOrderByCreatedAtDesc(List.of(BookingStatus.BROADCASTED))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public BookingDtos.BookingResponse get(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
    }

    private void addHistory(BookingRequestEntity booking, BookingStatus status, User actor, String note) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setStatus(status);
        history.setUpdatedBy(actor);
        history.setNote(note);
        historyRepository.save(history);
    }

    private BigDecimal calculatePlatformFee(BigDecimal budget) {
        if (budget == null) {
            return BigDecimal.ZERO;
        }
        return budget.multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateWorkerPayout(BigDecimal budget, BigDecimal platformFee) {
        if (budget == null) {
            return BigDecimal.ZERO;
        }
        return budget.subtract(platformFee == null ? BigDecimal.ZERO : platformFee).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private BookingDtos.BookingResponse toResponse(BookingRequestEntity booking) {
        List<BookingDtos.StatusHistoryItem> history = historyRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId())
                .stream()
                .map(item -> new BookingDtos.StatusHistoryItem(
                        item.getId(),
                        item.getStatus(),
                        item.getUpdatedBy().getId(),
                        item.getNote(),
                        item.getCreatedAt()
                ))
                .toList();
        BigDecimal platformFee = calculatePlatformFee(booking.getBudget());
        BigDecimal workerPayout = calculateWorkerPayout(booking.getBudget(), platformFee);
        return new BookingDtos.BookingResponse(
                booking.getId(),
                booking.getCustomer().getId(),
                booking.getWorkerProfile() == null ? null : booking.getWorkerProfile().getId(),
                booking.getCustomer().getFirstName() + " " + booking.getCustomer().getLastName(),
                booking.getWorkerProfile() == null ? null :
                        booking.getWorkerProfile().getUser().getFirstName() + " " + booking.getWorkerProfile().getUser().getLastName(),
                booking.getServiceCategory().getName(),
                booking.getTitle(),
                booking.getDescription(),
                booking.getBudget(),
                platformFee,
                workerPayout,
                booking.getExpectedDurationHours(),
                booking.getPreferredTime(),
                booking.getAddress(),
                booking.getLatitude(),
                booking.getLongitude(),
                booking.getUrgency(),
                booking.getStatus(),
                booking.getMatchExplanation(),
                history
        );
    }
}

