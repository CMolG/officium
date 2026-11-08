package com.javadaba.contexts.officium.domain.jql;

import java.util.List;

/** One field's grammar: what it is written as, its value kind, and the operators/sortability it
 *  allows -- the Java twin of {@code jql.ts}'s {@code FieldDef}/{@code FIELDS} array (the
 *  TypeScript file is the spec, contract JDB-270). */
record JqlField(JqlFieldId id, List<String> names, JqlFieldKind kind, List<JqlOp> ops, boolean sortable) {

    /** What it is written as in a query and read in a column header -- the first of {@link #names}. */
    String canonicalName() {
        return names.get(0);
    }
}
