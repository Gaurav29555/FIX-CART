package com.fixcart.platform.review;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/bookings/{bookingId}")
    public ReviewDtos.ReviewResponse create(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @PathVariable UUID bookingId,
            @Valid @RequestBody ReviewDtos.CreateReviewRequest request
    ) {
        return reviewService.create(principal.getUserId(), bookingId, request);
    }

    @GetMapping("/workers/{workerId}")
    public List<ReviewDtos.ReviewResponse> listByWorker(@PathVariable UUID workerId) {
        return reviewService.listByWorker(workerId);
    }
}
