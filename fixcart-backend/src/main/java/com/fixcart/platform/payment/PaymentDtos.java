package com.fixcart.platform.payment;

import java.math.BigDecimal;
import java.util.UUID;

public class PaymentDtos {

    public record CheckoutSessionResponse(
            UUID bookingId,
            String provider,
            BigDecimal amount,
            BigDecimal platformFee,
            BigDecimal workerPayout,
            String checkoutUrl,
            String message,
            boolean liveMode
    ) {}
}
