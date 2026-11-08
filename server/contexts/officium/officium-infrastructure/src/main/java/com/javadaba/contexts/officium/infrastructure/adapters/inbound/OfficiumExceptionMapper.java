package com.javadaba.contexts.officium.infrastructure.adapters.inbound;

import com.javadaba.contexts.officium.domain.DocPathTaken;
import com.javadaba.contexts.officium.domain.JqlInvalid;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PrecedenceInvalidException;
import com.javadaba.contexts.officium.domain.VersionConflict;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Maps every {@link OfficiumException} to the {@code httpStatus} set at its throw site (same
 * pattern as {@code FluxorExceptionMapper}). A {@link VersionConflict} adds {@code current} to the
 * body (contract §1.3: {@code 409 {error:"version_conflict", message, current}}) without knowing
 * the concrete entity type -- {@code CardVersionConflictException}/
 * {@code ProjectVersionConflictException} (officium-application) are the only implementers today.
 * A {@link JqlInvalid} (JDB-270) adds {@code at}, the character offset the query failed to parse
 * at (contract: {@code 400 {error:"jql_invalid", message, at}}).
 */
@Provider
public class OfficiumExceptionMapper implements ExceptionMapper<OfficiumException> {

    @Override
    public Response toResponse(OfficiumException exception) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", exception.code());
        body.put("message", exception.getMessage() == null ? exception.code() : exception.getMessage());
        if (exception instanceof VersionConflict conflict) {
            body.put("current", conflict.current());
        }
        if (exception instanceof DocPathTaken taken) {
            body.put("paths", taken.paths());
        }
        if (exception instanceof JqlInvalid invalid) {
            body.put("at", invalid.at());
        }
        if (exception instanceof PrecedenceInvalidException invalid) {
            body.put("ruleIndex", invalid.refusal().ruleIndex());
            body.put("field", invalid.refusal().field());
        }
        return Response.status(exception.httpStatus()).entity(body).build();
    }
}
