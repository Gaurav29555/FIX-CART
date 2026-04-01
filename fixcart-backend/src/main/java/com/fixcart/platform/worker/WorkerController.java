package com.fixcart.platform.worker;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workers")
public class WorkerController {

    private final WorkerService workerService;

    public WorkerController(WorkerService workerService) {
        this.workerService = workerService;
    }

    @GetMapping("/discover")
    public List<WorkerDtos.WorkerCardResponse> discover(
            @RequestParam(required = false) String categoryCode,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double maxBudget
    ) {
        return workerService.discover(categoryCode, latitude, longitude, maxBudget);
    }

    @GetMapping("/me")
    public WorkerDtos.WorkerProfileResponse myProfile(@AuthenticationPrincipal PlatformUserPrincipal principal) {
        return workerService.getOwnProfile(principal.getUserId());
    }

    @PatchMapping("/me")
    public WorkerDtos.WorkerProfileResponse upsert(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @Valid @RequestBody WorkerDtos.UpsertWorkerProfileRequest request
    ) {
        return workerService.upsert(principal.getUserId(), request);
    }
}
