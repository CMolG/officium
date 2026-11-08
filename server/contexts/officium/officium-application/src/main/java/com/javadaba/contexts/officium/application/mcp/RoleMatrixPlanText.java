package com.javadaba.contexts.officium.application.mcp;

/**
 * The MCP text about the owner's plan and the role matrix (JAVA-1007), apart from the registry so the registry stays
 * under its bar: what a read says about editing, and what a write refused for the plan answers.
 */
final class RoleMatrixPlanText {

    /** The projects.roleMatrix answer: whether the owner may change the matrix, and what a lapse keeps. */
    static final String VIEW = "`editable` says whether the owner's plan lets them change it; `overridesInactive` says "
            + "the stored overrides are kept but not in effect, because the plan no longer covers them.";

    /** The projects.setRoleMatrix description: a changed cell needs the plan, a re-save of the same cells does not. */
    static final String WRITE = "Changing any of it needs the Personal plan: a free owner is refused with "
            + "`plan_required`, and a re-save of the cells they already have is not. ";

    private RoleMatrixPlanText() {
    }
}
