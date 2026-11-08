package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocPage;
import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Officium's own documentation (JAVA-783, contract §8.15): one set of pages, shipped with the API
 * as resources and shown in every project under {@link DocPage#BUILTIN_PREFIX}. Every project reads
 * the same source, so a change reaches all of them with the next deploy; none can edit or delete
 * them.
 *
 * <p>{@code builtin-docs/index} names the pages, one per line ({@code roles} is
 * {@code officium/roles}, read from {@code builtin-docs/roles.md}): a native image cannot list a
 * resource directory. Each page's frontmatter gives its {@code title} and {@code last_updated}, as
 * the page schema requires. Read when the bean is first used, never in a static initializer
 * (native discipline).
 */
@ApplicationScoped
public class BuiltinDocs {

    static final String ROOT = "javadaba/officium/builtin-docs/";
    /** Who a built-in page shows as written by: Officium itself, not any account. */
    static final Actor AUTHOR = Actor.person(new UUID(0, 0), "Officium");

    private final List<Page> pages;

    public BuiltinDocs() {
        this(BuiltinDocs::read);
    }

    BuiltinDocs(ResourceReader reader) {
        List<Page> loaded = new ArrayList<>();
        for (String line : reader.read("index").split("\n")) {
            String name = line.strip();
            if (name.isEmpty() || name.startsWith("#")) {
                continue;
            }
            loaded.add(Page.parse(DocPage.normalizePath(DocPage.BUILTIN_PREFIX + "/" + name),
                    reader.read(name + ".md")));
        }
        this.pages = List.copyOf(loaded.stream().sorted((a, b) -> a.path().compareTo(b.path())).toList());
    }

    public List<Page> all() {
        return pages;
    }

    public Optional<Page> find(String path) {
        return pages.stream().filter(page -> page.path().equals(path)).findFirst();
    }

    /** A built-in page. Its id is derived from its path, so it is the same in every project and deploy. */
    public record Page(UUID id, String path, String title, String body, Instant updatedAt) {

        /** As a project's page, which is how every project sees it. */
        public DocPage in(UUID projectId) {
            return new DocPage(id, projectId, path, title, body, 1, AUTHOR, AUTHOR, updatedAt, updatedAt);
        }

        static Page parse(String path, String body) {
            String title = frontmatter(body, "title")
                    .orElseThrow(
                            () -> new IllegalStateException("Built-in page " + path + " has no frontmatter title"));
            String date = frontmatter(body, "last_updated").orElseThrow(
                    () -> new IllegalStateException("Built-in page " + path + " has no frontmatter last_updated"));
            Instant updatedAt;
            try {
                updatedAt = LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC).toInstant();
            } catch (DateTimeParseException ex) {
                throw new IllegalStateException("Built-in page " + path + ": last_updated is not YYYY-MM-DD", ex);
            }
            UUID id = UUID.nameUUIDFromBytes(("officium-builtin-doc:" + path).getBytes(StandardCharsets.UTF_8));
            return new Page(id, path, title, body, updatedAt);
        }

        /** A top-level scalar of the frontmatter block, unquoted; enough for the two fields read here. */
        private static Optional<String> frontmatter(String body, String key) {
            String[] lines = body.split("\n", -1);
            if (lines.length == 0 || !lines[0].strip().equals("---")) {
                return Optional.empty();
            }
            for (int i = 1; i < lines.length && !lines[i].strip().equals("---"); i++) {
                String line = lines[i];
                if (line.startsWith(key + ":")) {
                    String value = line.substring(key.length() + 1).strip();
                    if (value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"")
                            || value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    return value.isEmpty() ? Optional.empty() : Optional.of(value);
                }
            }
            return Optional.empty();
        }
    }

    /** Reads {@code builtin-docs/<name>}; a seam so a test can hand in its own pages. */
    interface ResourceReader {
        String read(String name);
    }

    private static String read(String name) {
        String resource = ROOT + name;
        try (InputStream in = BuiltinDocs.class.getClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException("A built-in page is missing from the classpath: " + resource);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Unable to read " + resource, ex);
        }
    }
}
