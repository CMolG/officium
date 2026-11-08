package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OrganizationNameTest {

    @Test
    void trimsAndCollapsesInnerWhitespace() {
        assertEquals("Acme Labs", new OrganizationName("  Acme   Labs ").value());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "A"})
    void refusesNamesShorterThanTwoCharacters(String raw) {
        assertThrows(OfficiumException.class, () -> new OrganizationName(raw));
    }

    @Test
    void refusesNamesLongerThanSixtyCharacters() {
        assertThrows(OfficiumException.class, () -> new OrganizationName("x".repeat(61)));
    }

    @Test
    void refusesControlCharacters() {
        assertThrows(OfficiumException.class, () -> new OrganizationName("Acme\u0007Labs"));
    }

    @Test
    void defaultIsTheOwnerNameWithSuffix() {
        assertEquals("Ana's organization", OrganizationName.defaultFor("Ana"));
    }

    @Test
    void defaultUsesTheEmailLocalPart() {
        assertEquals("carlos97's organization", OrganizationName.defaultFor("carlos97@example.com"));
    }

    @Test
    void defaultFallsBackWhenTheDirectoryKnowsNoName() {
        assertEquals("My organization", OrganizationName.defaultFor("  "));
    }

    @Test
    void defaultCutsALongOwnerNameAt40Characters() {
        assertEquals("x".repeat(40) + "'s organization", OrganizationName.defaultFor("x".repeat(80)));
    }
}
