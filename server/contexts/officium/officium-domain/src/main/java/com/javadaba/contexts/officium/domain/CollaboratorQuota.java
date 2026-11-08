package com.javadaba.contexts.officium.domain;

/**
 * How many collaborators an owner has across all their projects, against the cap they include
 * (JAVA-1009). The owner is not counted.
 */
public record CollaboratorQuota(int used, int cap) {
}
