package com.fixcart.platform.booking;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public BookingDtos.BookingResponse create(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @Valid @RequestBody BookingDtos.CreateBookingRequest request
    ) {
        return bookingService.createBooking(principal.getUserId(), request);
    }

    @PatchMapping("/{bookingId}/accept")
    public BookingDtos.BookingResponse accept(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @PathVariable UUID bookingId
    ) {
        return bookingService.acceptBooking(principal.getUserId(), bookingId);
    }

    @PatchMapping("/{bookingId}/status")
    public BookingDtos.BookingResponse updateStatus(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @PathVariable UUID bookingId,
            @Valid @RequestBody BookingDtos.UpdateStatusRequest request
    ) {
        return bookingService.updateStatus(principal.getUserId(), bookingId, request);
    }

    @GetMapping
    public List<BookingDtos.BookingResponse> list(@AuthenticationPrincipal PlatformUserPrincipal principal) {
        return bookingService.listForUser(principal.getUserId(), principal.getRole());
    }

    @GetMapping("/open")
    public List<BookingDtos.BookingResponse> openJobs() {
        return bookingService.listOpenJobsForWorkers();
    }

    @GetMapping("/{bookingId}")
    public BookingDtos.BookingResponse get(@PathVariable UUID bookingId) {
        return bookingService.get(bookingId);
    }
}
