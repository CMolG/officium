package com.javadaba.contexts.officium.application.github;

/** How a card fared when a commit naming it reached the default branch. */
enum Reached {
    /** Went from deploy to done. */
    MOVED,
    /** An earlier open card, told in a comment. */
    TOLD,
    /** Already done. */
    UNTOUCHED,
    /** In deploy, but the move lost two version conflicts in a row: the delivery must stay retryable. */
    LOST
}
