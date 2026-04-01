package com.fixcart.platform.payment;

import com.fixcart.platform.booking.BookingRequestEntity;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import java.math.BigDecimal;
import java.math.RoundingMode;

public class StripeCheckoutProvider implements PaymentProvider {

    private final String secretKey;
    private final String successUrl;
    private final String cancelUrl;
    private final String currency;

    public StripeCheckoutProvider(String secretKey, String successUrl, String cancelUrl, String currency) {
        this.secretKey = secretKey;
        this.successUrl = successUrl;
        this.cancelUrl = cancelUrl;
        this.currency = currency;
    }

    @Override
    public PaymentSession createCheckoutSession(BookingRequestEntity booking, BigDecimal platformFee, BigDecimal workerPayout) {
        try {
            Stripe.apiKey = secretKey;
            SessionCreateParams.LineItem.PriceData.ProductData productData = SessionCreateParams.LineItem.PriceData.ProductData.builder()
                    .setName("FixCart - " + booking.getTitle())
                    .setDescription(booking.getDescription())
                    .build();

            SessionCreateParams.LineItem.PriceData priceData = SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency(currency)
                    .setUnitAmount(toMinorUnits(booking.getBudget()))
                    .setProductData(productData)
                    .build();

            SessionCreateParams.LineItem lineItem = SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(priceData)
                    .build();

            SessionCreateParams.Builder builder = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl + (successUrl.contains("?") ? "&" : "?") + "session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
                    .setCustomerEmail(booking.getCustomer().getEmail())
                    .addLineItem(lineItem)
                    .putMetadata("bookingId", booking.getId().toString())
                    .putMetadata("customerId", booking.getCustomer().getId().toString())
                    .putMetadata("workerProfileId", booking.getWorkerProfile() == null ? "unassigned" : booking.getWorkerProfile().getId().toString())
                    .putMetadata("platformFee", platformFee.toPlainString())
                    .putMetadata("workerPayout", workerPayout.toPlainString());

            if (booking.getWorkerProfile() != null && booking.getWorkerProfile().getStripeConnectedAccountId() != null && !booking.getWorkerProfile().getStripeConnectedAccountId().isBlank()) {
                builder.setPaymentIntentData(
                        SessionCreateParams.PaymentIntentData.builder()
                                .setApplicationFeeAmount(toMinorUnits(platformFee))
                                .setTransferData(
                                        SessionCreateParams.PaymentIntentData.TransferData.builder()
                                                .setDestination(booking.getWorkerProfile().getStripeConnectedAccountId())
                                                .build()
                                )
                                .build()
                );
            }

            Session session = Session.create(builder.build());
            String message = booking.getWorkerProfile() != null && booking.getWorkerProfile().getStripeConnectedAccountId() != null && !booking.getWorkerProfile().getStripeConnectedAccountId().isBlank()
                    ? "Stripe Checkout session created with marketplace payout routing."
                    : "Stripe Checkout session created. Connect payout routing will activate once the worker has a connected Stripe account.";
            return new PaymentSession("stripe", session.getUrl(), message, true);
        } catch (StripeException exception) {
            throw new IllegalStateException("Stripe checkout session creation failed", exception);
        }
    }

    private long toMinorUnits(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"))
                .longValueExact();
    }
}
