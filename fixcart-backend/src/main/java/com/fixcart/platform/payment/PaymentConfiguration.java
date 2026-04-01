package com.fixcart.platform.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
public class PaymentConfiguration {

    @Bean
    public PaymentProvider paymentProvider(
            @Value("${app.payment.provider:stub}") String provider,
            @Value("${STRIPE_SECRET_KEY:}") String stripeSecretKey,
            @Value("${app.payment.success-url:https://example.com/payment-success}") String successUrl,
            @Value("${app.payment.cancel-url:https://example.com/payment-cancelled}") String cancelUrl,
            @Value("${app.payment.currency:inr}") String currency
    ) {
        if ("stripe".equalsIgnoreCase(provider) && StringUtils.hasText(stripeSecretKey)) {
            return new StripeCheckoutProvider(stripeSecretKey, successUrl, cancelUrl, currency);
        }
        return new StubPaymentProvider();
    }
}
