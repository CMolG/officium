package com.javadaba.contexts.officium.domain;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The files a page body points at (JAVA-798): {@code doc://<page path>/_files/<name>}, outside
 * code. A reference shown as code is an example, not a use, so it keeps nothing alive.
 */
public final class DocFileRefs {

    public record Ref(String pagePath, String name) {
    }

    private static final Pattern FENCED = Pattern.compile("(?ms)^\\s*(```|~~~).*?^\\s*\\1[^\\n]*$");
    private static final Pattern INLINE_CODE = Pattern.compile("(`+)[^`\\n]*?\\1");
    private static final Pattern REF = Pattern.compile(
            "doc://((?:[a-z0-9]+(?:-[a-z0-9]+)*/)*[a-z0-9]+(?:-[a-z0-9]+)*)/_files/([a-z0-9][a-z0-9.-]*)");

    private DocFileRefs() {
    }

    /** The markup of a file reference, which is also what an upload answers with. */
    public static String uri(String pagePath, String name) {
        return "doc://" + pagePath + "/_files/" + name;
    }

    public static Set<Ref> in(String body) {
        Set<Ref> refs = new LinkedHashSet<>();
        if (body == null || !body.contains("/_files/")) {
            return refs;
        }
        String prose = INLINE_CODE.matcher(FENCED.matcher(body).replaceAll("")).replaceAll("");
        Matcher m = REF.matcher(prose);
        while (m.find()) {
            String name = m.group(2).replaceAll("[.-]+$", "");
            if (DocAttachment.validName(name)) {
                refs.add(new Ref(m.group(1), name));
            }
        }
        return refs;
    }
}
