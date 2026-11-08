package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.ProjectMember;

import java.time.Instant;
import java.util.UUID;

/** {@code via} is {@code "direct"} for an invited member and {@code "team"} for one a team grants
 *  the project to, with that team's id (contract §8.5). */
public record MemberView(UUID accountId, String email, String name, String role, Instant createdAt, String via,
        UUID teamId) {

    public static final String DIRECT = "direct";
    public static final String TEAM = "team";

    public MemberView(UUID accountId, String email, String name, String role, Instant createdAt) {
        this(accountId, email, name, role, createdAt, DIRECT, null);
    }

    public static MemberView of(ProjectMember member, String email, String name) {
        return new MemberView(member.accountId(), email, name, member.role().wire(), member.createdAt());
    }
}
