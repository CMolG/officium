package com.javadaba.contexts.officium.domain;

/**
 * Domain-level business error, same shape as {@code FluxorException}: {@code code}/{@code
 * httpStatus} set explicitly at each throw site, mapped as-is by {@code OfficiumExceptionMapper}
 * (officium-infrastructure). {@code project_not_found}/{@code card_not_found} (404) cover both a
 * truly missing row and one the caller isn't a member of -- never 403, never reveals existence
 * (contract §1.2).
 */
public class OfficiumException extends RuntimeException {

    private final String code;
    private final int httpStatus;

    public OfficiumException(String code, String message, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public String code() {
        return code;
    }

    public int httpStatus() {
        return httpStatus;
    }

    public static OfficiumException notFound(String code, String message) {
        return new OfficiumException(code, message, 404);
    }

    public static OfficiumException conflict(String code, String message) {
        return new OfficiumException(code, message, 409);
    }

    public static OfficiumException badRequest(String code, String message) {
        return new OfficiumException(code, message, 400);
    }

    public static OfficiumException forbidden(String code, String message) {
        return new OfficiumException(code, message, 403);
    }
}
