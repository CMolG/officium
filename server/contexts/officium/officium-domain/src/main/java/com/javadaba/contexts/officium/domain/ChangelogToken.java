package com.javadaba.contexts.officium.domain;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;
import java.util.UUID;

/**
 * The secret a project's pipeline records changes with (JAVA-132, contract §8.8): one per project,
 * and only its hash is kept. The plain token is shown once, to the owner who created it.
 *
 * <p>SHA-256 and not a slow hash: the token is 256 random bits, so there is nothing to brute-force
 * and a salt would only stop the lookup by hash that authenticating needs (the same reasoning as
 * iam's opaque OAuth tokens).
 */
public record ChangelogToken(UUID projectId, String tokenHash, Actor createdBy, Instant createdAt) {

    /** Tells the token apart in a secret store or a leaked log. */
    public static final String PREFIX = "ofcl_";

    public ChangelogToken {
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(tokenHash, "tokenHash");
        Objects.requireNonNull(createdBy, "createdBy");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    public static String hash(String token) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Every JVM ships SHA-256", ex);
        }
    }
}
