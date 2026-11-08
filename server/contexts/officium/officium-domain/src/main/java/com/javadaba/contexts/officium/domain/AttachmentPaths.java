package com.javadaba.contexts.officium.domain;

import java.text.Normalizer;
import java.util.UUID;

/**
 * Where an uploaded file lands on the machine: {@code <CARD-KEY>/<8 hex>-<safe name>}, relative to
 * {@code .officium/attachments/}. The API decides it and the machine re-checks it (JDB-242), so a
 * crafted file name can never climb out of that directory: separators, dots at the start, control
 * characters and anything outside a conservative set are replaced, and the result is capped.
 */
public final class AttachmentPaths {

    private static final int MAX_NAME = 120;

    private AttachmentPaths() {
    }

    public static String forUpload(String cardKey, String fileName, UUID attachmentId) {
        String prefix = attachmentId.toString().substring(0, 8);
        return cardKey + "/" + prefix + "-" + safeName(fileName);
    }

    static String safeName(String fileName) {
        String base = fileName == null ? "" : fileName;
        int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
        base = Normalizer.normalize(base.substring(slash + 1), Normalizer.Form.NFKC);
        StringBuilder safe = new StringBuilder(base.length());
        for (int i = 0; i < base.length(); i++) {
            char c = base.charAt(i);
            safe.append(Character.isLetterOrDigit(c) || c == '.' || c == '-' || c == '_' ? c : '_');
        }
        String name = safe.toString().replaceAll("^[._]+", "");
        if (name.length() > MAX_NAME) {
            int dot = name.lastIndexOf('.');
            String ext = dot > 0 && name.length() - dot <= 10 ? name.substring(dot) : "";
            name = name.substring(0, MAX_NAME - ext.length()) + ext;
        }
        // No Windows reserved-name check (CON, NUL…): the 8-hex prefix means a stored name is never one.
        return name.isEmpty() ? "file" : name;
    }
}
