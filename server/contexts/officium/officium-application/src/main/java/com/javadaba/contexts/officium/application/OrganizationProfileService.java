package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OrganizationName;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.OrganizationNameRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.UUID;

/**
 * The organization's label and its owner, for the Organization page (JAVA-1780). An organization is its
 * owner's account, so the caller is always the owner: the only organization this reads or renames is
 * the caller's own, and no id of another account is ever taken.
 */
@ApplicationScoped
public class OrganizationProfileService {

    private final OrganizationNameRepository names;
    private final AccountDirectory directory;

    @Inject
    public OrganizationProfileService(OrganizationNameRepository names, AccountDirectory directory) {
        this.names = names;
        this.directory = directory;
    }

    public OrganizationProfileView view(UUID accountId) {
        AccountDirectory.Found owner = directory.findByAccountId(accountId)
                .orElse(new AccountDirectory.Found(accountId, "", ""));
        String name = names.find(accountId).map(OrganizationName::value)
                .orElseGet(() -> OrganizationName.defaultFor(owner.name()));
        return new OrganizationProfileView(accountId, name,
                new OrganizationProfileView.Owner(accountId, owner.name(), owner.email()));
    }

    public OrganizationProfileView rename(UUID accountId, String rawName) {
        names.put(accountId, new OrganizationName(rawName));
        return view(accountId);
    }

    public record OrganizationProfileView(UUID id, String name, Owner owner) {

        public record Owner(UUID accountId, String name, String email) {
        }
    }
}
