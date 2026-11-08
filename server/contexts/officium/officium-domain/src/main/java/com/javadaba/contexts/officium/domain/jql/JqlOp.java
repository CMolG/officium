package com.javadaba.contexts.officium.domain.jql;

/** OQL's operators, same set and symbols as {@code jql.ts}'s {@code Op} union (contract JDB-270). */
public enum JqlOp {
    EQ("="), NEQ("!="), GT(">"), GTE(">="), LT("<"), LTE("<="), CONTAINS("~"), NOT_CONTAINS("!~"), IN("in"), NOT_IN(
            "not in"), IS("is"), IS_NOT("is not");

    private final String symbol;

    JqlOp(String symbol) {
        this.symbol = symbol;
    }

    public String symbol() {
        return symbol;
    }

    static JqlOp fromSymbol(String symbol) {
        for (JqlOp op : values()) {
            if (op.symbol.equals(symbol)) {
                return op;
            }
        }
        throw new IllegalArgumentException("Unknown operator: " + symbol);
    }
}
