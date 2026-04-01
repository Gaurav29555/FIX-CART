package com.fixcart.platform.favorite;

import com.fixcart.platform.auth.User;
import com.fixcart.platform.auth.UserRepository;
import com.fixcart.platform.auth.UserRole;
import com.fixcart.platform.worker.WorkerProfile;
import com.fixcart.platform.worker.WorkerService;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class FavoriteWorkerService {

    private final FavoriteWorkerRepository favoriteWorkerRepository;
    private final UserRepository userRepository;
    private final WorkerService workerService;

    public FavoriteWorkerService(
            FavoriteWorkerRepository favoriteWorkerRepository,
            UserRepository userRepository,
            WorkerService workerService
    ) {
        this.favoriteWorkerRepository = favoriteWorkerRepository;
        this.userRepository = userRepository;
        this.workerService = workerService;
    }

    @Transactional(readOnly = true)
    public List<FavoriteDtos.FavoriteWorkerResponse> list(UUID customerId) {
        requireCustomer(customerId);
        return favoriteWorkerRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream()
                .map(favorite -> new FavoriteDtos.FavoriteWorkerResponse(
                        favorite.getId(),
                        favorite.getWorkerProfile().getId(),
                        favorite.getCustomer().getId(),
                        favorite.getCreatedAt()
                ))
                .toList();
    }

    public FavoriteDtos.FavoriteWorkerResponse save(UUID customerId, UUID workerId) {
        User customer = requireCustomer(customerId);
        WorkerProfile worker = workerService.findByWorkerId(workerId);
        FavoriteWorker favorite = favoriteWorkerRepository.findByCustomerIdAndWorkerProfileId(customerId, workerId)
                .orElseGet(() -> {
                    FavoriteWorker fresh = new FavoriteWorker();
                    fresh.setCustomer(customer);
                    fresh.setWorkerProfile(worker);
                    return favoriteWorkerRepository.save(fresh);
                });

        return new FavoriteDtos.FavoriteWorkerResponse(
                favorite.getId(),
                favorite.getWorkerProfile().getId(),
                favorite.getCustomer().getId(),
                favorite.getCreatedAt()
        );
    }

    public void remove(UUID customerId, UUID workerId) {
        requireCustomer(customerId);
        favoriteWorkerRepository.deleteByCustomerIdAndWorkerProfileId(customerId, workerId);
    }

    private User requireCustomer(UUID customerId) {
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new EntityNotFoundException("Customer not found"));
        if (customer.getRole() != UserRole.CUSTOMER) {
            throw new IllegalStateException("Only customers can manage saved workers");
        }
        return customer;
    }
}
