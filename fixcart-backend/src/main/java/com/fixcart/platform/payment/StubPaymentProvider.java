package com.fixcart.platform.payment;

import com.fixcart.platform.booking.BookingRequestEntity;
import java.math.BigDecimal;

public class StubPaymentProvider implements PaymentProvider {

    @Override
    public PaymentSession createCheckoutSession(BookingRequestEntity booking, BigDecimal platformFee, BigDecimal workerPayout) {
        return new PaymentSession(
                "stub",
                null,
                "Live payments are not activated yet. Add a real provider key to enable checkout and settlement.",
                false
        );
    }
}
