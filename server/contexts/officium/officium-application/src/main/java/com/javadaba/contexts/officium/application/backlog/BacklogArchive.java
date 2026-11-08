package com.javadaba.contexts.officium.application.backlog;

import com.javadaba.contexts.officium.application.backlog.BacklogImportExportService.BacklogFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * The backlog's Markdown files packed into one {@code .zip} (JAVA-1657): one entry per file, named as
 * the file is, so unzipping gives back the {@code .backlog/} folder {@code backlog.importMarkdown}
 * reads. The JDK's {@link ZipOutputStream} does it, with no dependency and no client-side writer.
 */
public record BacklogArchive(String filename, byte[] bytes) {

    public static byte[] zip(List<BacklogFile> files) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes, StandardCharsets.UTF_8)) {
            for (BacklogFile file : files) {
                zip.putNextEntry(new ZipEntry(file.name()));
                zip.write(file.content().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
            }
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
        return bytes.toByteArray();
    }
}
