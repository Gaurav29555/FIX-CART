package com.fixcart.platform.payment;

import com.fixcart.platform.booking.BookingRequestEntity;
import java.math.BigDecimal;

public interface PaymentProvider {

    PaymentSession createCheckoutSession(BookingRequestEntity booking, BigDecimal platformFee, BigDecimal workerPayout);

    record PaymentSession(
            String provider,
            String checkoutUrl,
            String message,
            boolean liveMode
    ) {}
}
