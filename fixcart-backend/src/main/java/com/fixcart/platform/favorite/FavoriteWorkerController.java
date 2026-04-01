package com.fixcart.platform.favorite;

import com.fixcart.platform.auth.PlatformUserPrincipal;
import com.fixcart.platform.common.ApiMessage;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/favorites/workers")
public class FavoriteWorkerController {

    private final FavoriteWorkerService favoriteWorkerService;

    public FavoriteWorkerController(FavoriteWorkerService favoriteWorkerService) {
        this.favoriteWorkerService = favoriteWorkerService;
    }

    @GetMapping
    public List<FavoriteDtos.FavoriteWorkerResponse> list(@AuthenticationPrincipal PlatformUserPrincipal principal) {
        return favoriteWorkerService.list(principal.getUserId());
    }

    @PostMapping("/{workerId}")
    public FavoriteDtos.FavoriteWorkerResponse save(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @PathVariable UUID workerId
    ) {
        return favoriteWorkerService.save(principal.getUserId(), workerId);
    }

    @DeleteMapping("/{workerId}")
    public ApiMessage remove(
            @AuthenticationPrincipal PlatformUserPrincipal principal,
            @PathVariable UUID workerId
    ) {
        favoriteWorkerService.remove(principal.getUserId(), workerId);
        return new ApiMessage("Worker removed from saved list");
    }
}
