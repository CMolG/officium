package com.javadaba.contexts.officium.application.mcp;

import com.javadaba.contexts.officium.application.DocAttachmentService;
import com.javadaba.contexts.officium.application.DocAttachmentView;
import com.javadaba.contexts.officium.application.mcp.OfficiumMcpRegistry.OfficiumCaller;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.platform.mcp.McpOperation;
import com.javadaba.platform.mcp.McpParams;
import com.javadaba.platform.mcp.McpSchemas;

import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The files and images of a documentation page (JAVA-798, contract §8.7), the MCP twin of
 * {@code …/docs/{path}/_files}. Bytes travel as base64, 5 MB decoded at most.
 */
final class McpDocAttachments {

    private static final String EX_PROJECT = "11111111-1111-1111-1111-111111111111";

    private McpDocAttachments() {
    }

    static List<McpOperation<OfficiumCaller>> operations(DocAttachmentService files) {
        Map<String, Object> pageProps = Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string());
        Map<String, Object> fileProps = Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                "name", McpSchemas.string());
        Map<String, Object> pageExample = Map.of("projectId", EX_PROJECT, "path", "procedures/deploy");
        Map<String, Object> fileExample = Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "name",
                "flow.png");
        return List.of(
                new McpOperation<>("docs.attachments.list",
                        "The files and images of a page, without their bytes: each with its `uri` to write into the "
                                + "page's Markdown, its type, and the bytes sent and kept.",
                        McpOperation.READ, "officium:read", McpSchemas.schema(pageProps, List.of("projectId", "path")),
                        pageExample,
                        (caller, params) -> {
                            String path = McpParams.requiredString(params, "path");
                            String normalized = DocPage.normalizePath(path);
                            return files.list(caller.accountId(), McpParams.uuid(params, "projectId"), path).stream()
                                    .map(a -> DocAttachmentView.of(a, normalized)).toList();
                        }),
                new McpOperation<>("docs.attachments.get",
                        "One file with its bytes as `contentBase64`, plus the same fields as docs.attachments.list.",
                        McpOperation.READ, "officium:read",
                        McpSchemas.schema(fileProps, List.of("projectId", "path", "name")), fileExample,
                        (caller, params) -> {
                            String path = McpParams.requiredString(params, "path");
                            var content = files.read(caller.accountId(), McpParams.uuid(params, "projectId"), path,
                                    McpParams.requiredString(params, "name"));
                            Map<String, Object> answer = new LinkedHashMap<>();
                            answer.put("attachment", DocAttachmentView.of(content.attachment(),
                                    DocPage.normalizePath(path)));
                            answer.put("contentBase64", Base64.getEncoder().encodeToString(content.data()));
                            return answer;
                        }),
                new McpOperation<>("docs.attachments.upload",
                        "Adds a file or an image to a page (editor+), 5 MB at most once decoded. Give `name` "
                                + "(lower-case letters, digits, dots and hyphens; it is never renamed, and a taken "
                                + "name answers `attachment_exists`), its `contentType` and `contentBase64`. An image "
                                + "(JPEG, PNG) is reduced on the server with no visible loss and kept only if smaller; "
                                + "GIF and WebP are kept as sent; every image loses its EXIF, GPS and XMP. HEIC, AVIF, "
                                + "TIFF, animated PNG and SVG are refused. Answers the `uri` to write into the page: "
                                + "`![caption](uri)` for an image, `[name](uri)` for a file.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(Map.of("projectId", McpSchemas.string(), "path", McpSchemas.string(),
                                "name", McpSchemas.string(), "contentType", McpSchemas.string(), "contentBase64",
                                McpSchemas.string()),
                                List.of("projectId", "path", "name", "contentType", "contentBase64")),
                        Map.of("projectId", EX_PROJECT, "path", "procedures/deploy", "name", "flow.png",
                                "contentType", "image/png", "contentBase64", "iVBORw0KGgo="),
                        (caller, params) -> {
                            String path = McpParams.requiredString(params, "path");
                            var uploaded = files.upload(caller.accountId(), McpParams.uuid(params, "projectId"), path,
                                    McpParams.requiredString(params, "name"),
                                    McpParams.requiredString(params, "contentType"),
                                    decode(McpParams.requiredString(params, "contentBase64")),
                                    DocAttachmentService.MCP_MAX_BYTES, caller.actor());
                            return DocAttachmentView.of(uploaded.attachment(), DocPage.normalizePath(path));
                        }),
                new McpOperation<>("docs.attachments.delete",
                        "Deletes a file from a page (editor+). A page that still points at it shows it as missing; "
                                + "a kept version of the page or the trash keeps the file alive until they go.",
                        McpOperation.WRITE, "officium:write",
                        McpSchemas.schema(fileProps, List.of("projectId", "path", "name")), fileExample,
                        (caller, params) -> {
                            files.delete(caller.accountId(), McpParams.uuid(params, "projectId"),
                                    McpParams.requiredString(params, "path"),
                                    McpParams.requiredString(params, "name"));
                            return Map.of("deleted", true);
                        }));
    }

    /** Refuses before decoding: base64 is 4 characters per 3 bytes. */
    private static byte[] decode(String base64) {
        if (base64.length() > DocAttachmentService.MCP_MAX_BYTES * 4 / 3 + 8) {
            throw new OfficiumException("attachment_too_large", "Over MCP a file is 5 MB at most", 413);
        }
        try {
            return Base64.getMimeDecoder().decode(base64);
        } catch (IllegalArgumentException ex) {
            throw OfficiumException.badRequest("invalid_base64", "`contentBase64` is not valid base64");
        }
    }
}
