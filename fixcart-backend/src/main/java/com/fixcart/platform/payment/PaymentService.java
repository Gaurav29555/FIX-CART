package com.fixcart.platform.payment;

import com.fixcart.platform.booking.BookingRequestEntity;
import com.fixcart.platform.booking.BookingRequestRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private final BookingRequestRepository bookingRequestRepository;
    private final PaymentProvider paymentProvider;

    public PaymentService(BookingRequestRepository bookingRequestRepository, PaymentProvider paymentProvider) {
        this.bookingRequestRepository = bookingRequestRepository;
        this.paymentProvider = paymentProvider;
    }

    public PaymentDtos.CheckoutSessionResponse createCheckoutSession(UUID bookingId) {
        BookingRequestEntity booking = bookingRequestRepository.findById(bookingId)
                .orElseThrow(() -> new EntityNotFoundException("Booking not found"));
        BigDecimal platformFee = booking.getBudget().multiply(new BigDecimal("0.12")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal workerPayout = booking.getBudget().subtract(platformFee).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        PaymentProvider.PaymentSession session = paymentProvider.createCheckoutSession(booking, platformFee, workerPayout);
        return new PaymentDtos.CheckoutSessionResponse(
                booking.getId(),
                session.provider(),
                booking.getBudget(),
                platformFee,
                workerPayout,
                session.checkoutUrl(),
                session.message(),
                session.liveMode()
        );
    }
}
