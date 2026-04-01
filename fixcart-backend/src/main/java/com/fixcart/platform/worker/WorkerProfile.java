package com.fixcart.platform.worker;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.category.ServiceCategory;
import com.fixcart.platform.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "worker_profiles")
public class WorkerProfile extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_category_id")
    private ServiceCategory primaryCategory;

    @Column(length = 1000)
    private String bio;

    private Integer experienceYears;

    @Column(precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Column(precision = 10, scale = 2)
    private BigDecimal hourlyRate;

    private Double latitude;

    private Double longitude;

    private Double serviceRadiusKm;

    @Column(nullable = false)
    private boolean available = true;

    @Column(nullable = false)
    private double rating = 0.0;

    @Column(nullable = false)
    private int totalReviews = 0;

    @Column(nullable = false)
    private long completedJobs = 0;

    @Column(nullable = false)
    private long acceptedJobs = 0;

    @Column(length = 255)
    private String stripeConnectedAccountId;
}

