package com.fixcart.platform.config;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.auth.UserRole;
import com.fixcart.platform.category.ServiceCategory;
import com.fixcart.platform.category.ServiceCategoryRepository;
import com.fixcart.platform.worker.AvailabilitySlot;
import com.fixcart.platform.worker.AvailabilitySlotRepository;
import com.fixcart.platform.worker.WorkerProfile;
import com.fixcart.platform.worker.WorkerProfileRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class SeedDataConfig {

    @Bean
    CommandLineRunner seedCategories(ServiceCategoryRepository categoryRepository) {
        return args -> {
            List<ServiceCategory> categories = List.of(
                    category("PLUMBING", "Plumbing", "wrench"),
                    category("ELECTRICAL", "Electrical", "bolt"),
                    category("CARPENTRY", "Carpentry", "hammer"),
                    category("CLEANING", "Cleaning", "sparkles"),
                    category("PAINTING", "Painting", "paintbrush"),
                    category("HANDYMAN", "Handyman", "toolbox"),
                    category("GARDENING", "Gardening", "leaf"),
                    category("APPLIANCE", "Appliance Repair", "settings")
            );
            for (ServiceCategory candidate : categories) {
                categoryRepository.findByCodeIgnoreCase(candidate.getCode())
                        .orElseGet(() -> categoryRepository.save(candidate));
            }
        };
    }

    @Bean
    CommandLineRunner seedDemoUsers(
            UserRepository userRepository,
            WorkerProfileRepository workerProfileRepository,
            AvailabilitySlotRepository availabilitySlotRepository,
            ServiceCategoryRepository categoryRepository,
            PasswordEncoder passwordEncoder
    ) {
        return args -> {
            if (userRepository.findByEmailIgnoreCase("customer@fixcart.app").isPresent()) {
                return;
            }

            User customer = new User();
            customer.setEmail("customer@fixcart.app");
            customer.setPasswordHash(passwordEncoder.encode("Password@123"));
            customer.setFirstName("Rahul");
            customer.setLastName("Sharma");
            customer.setPhone("9999999999");
            customer.setRole(UserRole.CUSTOMER);
            userRepository.save(customer);

            User workerUser = new User();
            workerUser.setEmail("worker@fixcart.app");
            workerUser.setPasswordHash(passwordEncoder.encode("Password@123"));
            workerUser.setFirstName("Aman");
            workerUser.setLastName("Verma");
            workerUser.setPhone("8888888888");
            workerUser.setRole(UserRole.WORKER);
            userRepository.save(workerUser);

            ServiceCategory plumbing = categoryRepository.findByCodeIgnoreCase("PLUMBING")
                    .orElseGet(() -> categoryRepository.save(category("PLUMBING", "Plumbing", "wrench")));
            WorkerProfile worker = new WorkerProfile();
            worker.setUser(workerUser);
            worker.setPrimaryCategory(plumbing);
            worker.setBio("Fast-response plumber for leakage, taps, fittings, and emergency repairs.");
            worker.setExperienceYears(6);
            worker.setBasePrice(new BigDecimal("399"));
            worker.setHourlyRate(new BigDecimal("299"));
            worker.setLatitude(19.0760);
            worker.setLongitude(72.8777);
            worker.setServiceRadiusKm(20.0);
            worker.setAvailable(true);
            worker.setRating(4.8);
            worker.setTotalReviews(12);
            worker.setCompletedJobs(48);
            worker.setAcceptedJobs(52);
            worker = workerProfileRepository.save(worker);

            WorkerProfile finalWorker = worker;
            List<AvailabilitySlot> slots = List.of(
                    slot(finalWorker, DayOfWeek.MONDAY),
                    slot(finalWorker, DayOfWeek.WEDNESDAY),
                    slot(finalWorker, DayOfWeek.SATURDAY)
            );
            availabilitySlotRepository.saveAll(slots);
        };
    }

    private ServiceCategory category(String code, String name, String icon) {
        ServiceCategory category = new ServiceCategory();
        category.setCode(code);
        category.setName(name);
        category.setIcon(icon);
        category.setActive(true);
        return category;
    }

    private AvailabilitySlot slot(WorkerProfile worker, DayOfWeek dayOfWeek) {
        AvailabilitySlot slot = new AvailabilitySlot();
        slot.setWorkerProfile(worker);
        slot.setDayOfWeek(dayOfWeek);
        slot.setStartTime(LocalTime.of(9, 0));
        slot.setEndTime(LocalTime.of(18, 0));
        return slot;
    }
}
