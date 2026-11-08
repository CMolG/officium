package com.javadaba.apps.api.account;

import jakarta.enterprise.context.ApplicationScoped;

import java.util.UUID;

/** Local stand-in: there is no native-app sign-in to bind a credential to, so nothing is bound. */
@ApplicationScoped
public class SignInBound {

    public UUID family() {
        return null;
    }

    public void confirm(UUID family) {
        // Nothing to confirm: a local credential never ends with a sign-in.
    }
}
