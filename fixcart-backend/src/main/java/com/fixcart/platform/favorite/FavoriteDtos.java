package com.fixcart.platform.favorite;

import java.time.Instant;
import java.util.UUID;

public class FavoriteDtos {

    public record FavoriteWorkerResponse(
            UUID id,
            UUID workerId,
            UUID customerId,
            Instant createdAt
    ) {}
}
