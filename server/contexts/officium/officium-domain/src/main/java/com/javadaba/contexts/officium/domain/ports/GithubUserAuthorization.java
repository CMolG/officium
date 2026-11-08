package com.javadaba.contexts.officium.domain.ports;

import java.util.List;
import java.util.Optional;

/**
 * GitHub's user authorization for the Officium GitHub App (JAVA-397): what proves an account may
 * choose an installed repository. GitHub's docs rule out trusting the {@code installation_id} a
 * redirect carries, so the only evidence is what a user access token lists.
 *
 * <p>The token never leaves {@link #installations}: it is exchanged, used and dropped inside the call,
 * so nothing can store, log or return it.
 */
public interface GithubUserAuthorization {

    /** {@code false} while the App's client id or secret is missing: nothing can be authorized. */
    boolean configured();

    /** Where the browser authorizes the App for this user, carrying {@code state} back. */
    String authorizeUrl(String state);

    /** Where the browser installs the App, ending on the same callback; empty with no App slug set. */
    Optional<String> installUrl(String state);

    /**
     * Exchanges {@code code} for a user access token and answers every installation of the App that
     * token reaches, each with the repositories it reaches there.
     *
     * @throws Rejected when GitHub refuses the code
     * @throws Unavailable when GitHub can't be reached or answers something else
     */
    List<Installation> installations(String code);

    /** One installation and its repositories, {@code owner/repo} as GitHub names them. */
    record Installation(long id, List<String> repos) {
    }

    /** GitHub refused the code: expired, used, or not this App's. */
    final class Rejected extends RuntimeException {
        public Rejected(String message) {
            super(message);
        }
    }

    final class Unavailable extends RuntimeException {
        public Unavailable(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
