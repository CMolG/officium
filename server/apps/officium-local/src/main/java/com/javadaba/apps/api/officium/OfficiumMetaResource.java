package com.javadaba.apps.api.officium;

import com.javadaba.contexts.officium.application.CardService;
import com.javadaba.contexts.officium.application.MetaService;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/** {@code GET /officium/v1/meta} (contract §3) -- no session needed, it's fixed vocabulary. */
@Path("/officium/v1/meta")
@Produces(MediaType.APPLICATION_JSON)
public class OfficiumMetaResource {

    private final CardService cards;

    public OfficiumMetaResource(CardService cards) {
        this.cards = cards;
    }

    @GET
    public MetaService.Meta get() {
        return MetaService.global(cards.rejectionEnabled());
    }
}
