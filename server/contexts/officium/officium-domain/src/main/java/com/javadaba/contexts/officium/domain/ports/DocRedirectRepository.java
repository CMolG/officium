package com.javadaba.contexts.officium.domain.ports;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/** Where moved documentation pages used to live (JAVA-792): old path to the page that moved. */
public interface DocRedirectRepository {

    /** For each of {@code fromPaths} that has a redirect, the present path of the page it follows. */
    Map<String, String> currentPaths(UUID projectId, Collection<String> fromPaths);
}
