package com.javadaba.contexts.officium.domain;

/**
 * The entitlement ids Officium asks billing about (JAVA-1007). Each one is declared in billing's
 * {@code plans.yaml}, and a test fails the build when one of these is not granted by a purchasable plan.
 * The defaults stay free for everyone: these gate EDITING the role matrix, never reading it.
 */
public final class Entitlements {

    /** Roles per category, the mods on a cell and the work profile's customizations. */
    public static final String ROLE_MATRIX_EDIT = "role-matrix-edit";

    /** The model and effort per category. */
    public static final String RUN_CONFIG_EDIT = "run-config-edit";

    private Entitlements() {
    }

    /** The refusal of an edit the owner's plan does not cover: 403 {@code plan_required}, as JAVA-1009 refuses a plan limit. */
    public static OfficiumException planRequired() {
        return OfficiumException.forbidden("plan_required",
                "Changing roles, models and efforts per category is part of the Personal plan");
    }
}
