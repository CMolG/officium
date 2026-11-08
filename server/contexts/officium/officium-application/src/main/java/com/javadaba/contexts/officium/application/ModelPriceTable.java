package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.domain.ModelPrice;
import com.javadaba.contexts.officium.domain.ModelPrices;
import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * The versioned price table the value report prices usage with (card://JAVA-1047), read from its resource when the
 * bean is first used, never in a static initializer (native discipline). The file is the one place prices live: a
 * new version of a model is a new row, never an edit of an old one.
 */
@ApplicationScoped
public class ModelPriceTable {

    static final String RESOURCE = "javadaba/officium/model-prices.json";

    private final ModelPrices prices;

    public ModelPriceTable() {
        this(ModelPriceTable::read);
    }

    ModelPriceTable(Reader reader) {
        this.prices = parse(reader.read());
    }

    public ModelPrices prices() {
        return prices;
    }

    /** The table a JSON document describes: {@code {"prices": [{model, from, inputPerMillion, ...}]}}. */
    static ModelPrices parse(String json) {
        try {
            JsonNode rows = new ObjectMapper().readTree(json).get("prices");
            List<ModelPrice> prices = new ArrayList<>();
            for (JsonNode row : rows) {
                prices.add(new ModelPrice(row.get("model").asText(), LocalDate.parse(row.get("from").asText()),
                        row.get("inputPerMillion").asDouble(), row.get("cacheWrite5mPerMillion").asDouble(),
                        row.get("cacheWrite1hPerMillion").asDouble(), row.get("cacheReadPerMillion").asDouble(),
                        row.get("outputPerMillion").asDouble(), row.get("source").asText(),
                        LocalDate.parse(row.get("checkedOn").asText())));
            }
            return new ModelPrices(prices);
        } catch (IOException ex) {
            throw new IllegalStateException("The model price table is not valid JSON", ex);
        }
    }

    /** Reads the resource; a seam so a test can hand in its own table. */
    interface Reader {
        String read();
    }

    private static String read() {
        try (InputStream in = ModelPriceTable.class.getClassLoader().getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("The model price table is missing from the classpath: " + RESOURCE);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Unable to read " + RESOURCE, ex);
        }
    }
}
