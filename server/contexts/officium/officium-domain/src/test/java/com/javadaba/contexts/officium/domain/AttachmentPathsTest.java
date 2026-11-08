package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AttachmentPathsTest {

    private static final UUID ID = UUID.fromString("0123abcd-0000-0000-0000-000000000000");

    @ParameterizedTest(name = "\"{0}\" lands as {1}")
    @CsvSource(delimiter = '|', value = {
            "report.pdf               | OFF-12/0123abcd-report.pdf",
            "../../etc/passwd         | OFF-12/0123abcd-passwd",
            "..\\..\\Windows\\win.ini | OFF-12/0123abcd-win.ini",
            ".env                     | OFF-12/0123abcd-env",
            "my file (final).docx     | OFF-12/0123abcd-my_file__final_.docx",
            "''                       | OFF-12/0123abcd-file",
            "...                      | OFF-12/0123abcd-file",
    })
    void aFileNameNeverClimbsOutOfTheCardFolder(String fileName, String expected) {
        assertThat(AttachmentPaths.forUpload("OFF-12", fileName, ID)).isEqualTo(expected);
    }

    @ParameterizedTest(name = "a {0}-character name is capped, keeping .pdf")
    @CsvSource({"300", "121"})
    void aLongNameIsCappedAndKeepsItsExtension(int length) {
        String name = "a".repeat(length) + ".pdf";
        String stored = AttachmentPaths.forUpload("OFF-1", name, ID);
        assertThat(stored).endsWith(".pdf");
        assertThat(stored.substring("OFF-1/0123abcd-".length())).hasSizeLessThanOrEqualTo(120);
    }
}
