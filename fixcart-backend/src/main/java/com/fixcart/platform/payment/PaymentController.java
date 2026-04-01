package com.fixcart.platform.payment;

import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/bookings/{bookingId}/checkout-session")
    public PaymentDtos.CheckoutSessionResponse createCheckoutSession(@PathVariable UUID bookingId) {
        return paymentService.createCheckoutSession(bookingId);
    }
}
