package com.fixcart.platform.review;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.booking.BookingRequestEntity;
import com.fixcart.platform.booking.BookingRequestRepository;
import com.fixcart.platform.booking.BookingStatus;
import com.fixcart.platform.moderation.ContentModerationService;
import com.fixcart.platform.worker.WorkerProfile;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRequestRepository bookingRepository;
    private final UserRepository userRepository;
    private final ContentModerationService contentModerationService;

    public ReviewService(
            ReviewRepository reviewRepository,
            BookingRequestRepository bookingRepository,
            UserRepository userRepository,
            ContentModerationService contentModerationService
    ) {
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.contentModerationService = contentModerationService;
    }

    public ReviewDtos.ReviewResponse create(UUID customerId, UUID bookingId, ReviewDtos.CreateReviewRequest request) {
        BookingRequestEntity booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new IllegalStateException("Only the booking customer can review this job");
        }
        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new IllegalStateException("Reviews are allowed only after completion");
        }
        if (booking.getWorkerProfile() == null) {
            throw new IllegalStateException("Cannot review an unassigned booking");
        }
        reviewRepository.findByBookingId(bookingId).ifPresent(existing -> {
            throw new IllegalStateException("Review already submitted for this booking");
        });

        Review review = new Review();
        review.setBooking(booking);
        review.setCustomer(customer);
        review.setWorkerProfile(booking.getWorkerProfile());
        review.setRating(request.rating());
        review.setComment(contentModerationService.sanitizeAndValidate(request.comment(), "Review comment", 1000));
        Review saved = reviewRepository.save(review);

        WorkerProfile worker = booking.getWorkerProfile();
        List<Review> allReviews = reviewRepository.findByWorkerProfileIdOrderByCreatedAtDesc(worker.getId());
        int totalReviews = allReviews.size();
        double average = allReviews.stream().mapToInt(Review::getRating).average().orElse(0.0);
        worker.setTotalReviews(totalReviews);
        worker.setRating(Math.round(average * 10.0) / 10.0);

        return new ReviewDtos.ReviewResponse(
                saved.getId(),
                bookingId,
                worker.getId(),
                customerId,
                saved.getRating(),
                saved.getComment(),
                saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ReviewDtos.ReviewResponse> listByWorker(UUID workerId) {
        return reviewRepository.findByWorkerProfileIdOrderByCreatedAtDesc(workerId).stream()
                .map(review -> new ReviewDtos.ReviewResponse(
                        review.getId(),
                        review.getBooking().getId(),
                        review.getWorkerProfile().getId(),
                        review.getCustomer().getId(),
                        review.getRating(),
                        review.getComment(),
                        review.getCreatedAt()
                ))
                .toList();
    }
}
