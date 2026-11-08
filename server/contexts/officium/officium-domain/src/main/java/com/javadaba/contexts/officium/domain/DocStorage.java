package com.javadaba.contexts.officium.domain;

/**
 * The bytes a project's documentation weighs, by kind (JAVA-794). {@code pagesBytes} are the pages not
 * in the trash and {@code trashBytes} the trashed ones (JAVA-793); attachments (JAVA-798) answer 0 until
 * that card lands.
 */
public record DocStorage(long pagesBytes, long historyBytes, long attachmentsBytes, long trashBytes,
        long commentsBytes) {
}
