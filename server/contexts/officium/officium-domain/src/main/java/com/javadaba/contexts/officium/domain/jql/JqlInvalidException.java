package com.javadaba.contexts.officium.domain.jql;

import com.javadaba.contexts.officium.domain.JqlInvalid;
import com.javadaba.contexts.officium.domain.OfficiumException;

/** A query that does not parse (contract JDB-270: {@code 400 {error:"jql_invalid", message,
 *  at}}) -- {@code at} is the 0-based character offset {@code jql.ts}'s own {@code ParseError}
 *  carries; the view shows it 1-based, as Jira does. */
public final class JqlInvalidException extends OfficiumException implements JqlInvalid {

    private final int at;

    public JqlInvalidException(String message, int at) {
        super("jql_invalid", message, 400);
        this.at = at;
    }

    @Override
    public int at() {
        return at;
    }
}
