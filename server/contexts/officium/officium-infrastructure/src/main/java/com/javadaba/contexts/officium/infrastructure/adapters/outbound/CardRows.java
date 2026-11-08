package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardRejection;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.HumanEdit;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Signal;
import com.javadaba.contexts.officium.domain.SpikeSubtype;
import com.javadaba.contexts.officium.domain.Status;

import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * A card as one row of {@code officium_card}: its columns, how an insert binds them and how a row
 * reads back. Split out of {@link JdbcCardRepository}, which owns the queries, to keep it under its
 * size bar (card://JAVA-1415).
 */
final class CardRows {

    static final String COLUMNS = "id, project_id, key, number, title, description, action_plan, status, "
            + "run_state, priority, executor, card_order, estimate, epic, tags, assignees, version, created_at, "
            + "updated_at, created_by, updated_by, deleted_at, client_key, human_edited_at, human_edited_by, "
            + "human_edit_reviewed_at, category, sprint_id, rank, signals, subtype, rejection_reason, rejection_note, "
            + "rejection_card_id, workflow";

    static final String INSERT_SQL = "insert into officium_card (" + COLUMNS + ") "
            + "values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb), ?, ?, ?, cast(? as jsonb), "
            + "cast(? as jsonb), ?, ?, ?, cast(? as jsonb), ?, ?, ?, ?, ?, ?, ?, ?, ?, cast(? as jsonb))";

    private CardRows() {
    }

    static void bindInsert(Connection connection, PreparedStatement statement, Card card) throws SQLException {
        statement.setObject(1, card.id());
        statement.setObject(2, card.projectId());
        statement.setString(3, card.key());
        statement.setInt(4, card.number());
        statement.setString(5, card.title());
        statement.setString(6, card.description());
        statement.setString(7, card.actionPlan());
        statement.setString(8, card.status().wire());
        statement.setString(9, card.runState().wire());
        statement.setString(10, card.priority().wire());
        statement.setString(11, card.executor().wire());
        statement.setInt(12, card.order());
        statement.setDouble(13, card.estimate());
        statement.setString(14, card.epic());
        statement.setArray(15, connection.createArrayOf("text", card.tags().toArray()));
        statement.setString(16, OfficiumJson.writeAssignees(card.assignees()));
        statement.setInt(17, card.version());
        statement.setTimestamp(18, Timestamp.from(card.createdAt()));
        statement.setTimestamp(19, Timestamp.from(card.updatedAt()));
        statement.setString(20, OfficiumJson.writeActor(card.createdBy()));
        statement.setString(21, OfficiumJson.writeActor(card.updatedBy()));
        statement.setTimestamp(22, card.deletedAt() == null ? null : Timestamp.from(card.deletedAt()));
        statement.setString(23, card.clientKey());
        bindHumanEdit(statement, 24, card.humanEdit());
        statement.setString(27, categoryWire(card));
        statement.setObject(28, card.sprintId());
        statement.setInt(29, card.rank());
        statement.setArray(30, signalsArray(connection, card));
        statement.setString(31, subtypeWire(card));
        bindRejection(statement, 32, card.rejection());
        statement.setString(35, CardWorkflowJson.write(card.workflow()));
    }

    static Array signalsArray(Connection connection, Card card) throws SQLException {
        return connection.createArrayOf("text", card.signals().stream().map(Signal::wire).toArray());
    }

    static String subtypeWire(Card card) {
        return card.subtype() == null ? null : card.subtype().wire();
    }

    static String categoryWire(Card card) {
        return card.category() == null ? null : card.category().wire();
    }

    /** The three rejection columns, in order: reason, note, the card it names. Null clears them. */
    static void bindRejection(PreparedStatement statement, int first, CardRejection rejection) throws SQLException {
        statement.setString(first, rejection == null ? null : rejection.reason().wire());
        statement.setString(first + 1, rejection == null ? null : rejection.note());
        statement.setObject(first + 2, rejection == null ? null : rejection.cardId());
    }

    /** The three human-edit columns, in order: when, who (jsonb), reviewed when. */
    static void bindHumanEdit(PreparedStatement statement, int first, HumanEdit edit) throws SQLException {
        statement.setTimestamp(first, edit == null ? null : Timestamp.from(edit.editedAt()));
        statement.setString(first + 1, edit == null ? null : OfficiumJson.writeActor(edit.editedBy()));
        statement.setTimestamp(first + 2, edit == null || edit.reviewedAt() == null
                ? null
                : Timestamp.from(edit.reviewedAt()));
    }

    static Card map(ResultSet rs) throws SQLException {
        Array tagsArray = rs.getArray("tags");
        List<String> tags = tagsArray == null ? List.of() : List.of((String[]) tagsArray.getArray());
        Timestamp deletedAt = rs.getTimestamp("deleted_at");
        Timestamp humanEditedAt = rs.getTimestamp("human_edited_at");
        Timestamp humanEditReviewedAt = rs.getTimestamp("human_edit_reviewed_at");
        String category = rs.getString("category");
        HumanEdit humanEdit = humanEditedAt == null
                ? null
                : new HumanEdit(humanEditedAt.toInstant(), OfficiumJson.readActor(rs.getString("human_edited_by")),
                        humanEditReviewedAt == null ? null : humanEditReviewedAt.toInstant());
        return new Card(
                rs.getObject("id", UUID.class),
                rs.getObject("project_id", UUID.class),
                rs.getString("key"),
                rs.getInt("number"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("action_plan"),
                Status.fromWire(rs.getString("status")),
                RunState.fromWire(rs.getString("run_state")),
                Priority.fromWire(rs.getString("priority")),
                Executor.fromWire(rs.getString("executor")),
                category == null ? null : Category.fromWire(category),
                rs.getInt("card_order"),
                rs.getDouble("estimate"),
                rs.getString("epic"),
                tags,
                OfficiumJson.readAssignees(rs.getString("assignees")),
                rs.getInt("version"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant(),
                OfficiumJson.readActor(rs.getString("created_by")),
                OfficiumJson.readActor(rs.getString("updated_by")),
                deletedAt == null ? null : deletedAt.toInstant(),
                rs.getString("client_key"),
                humanEdit,
                rs.getObject("sprint_id", UUID.class),
                rs.getInt("rank"),
                readSignals(rs.getArray("signals")),
                readSubtype(rs.getString("subtype")),
                readRejection(rs),
                CardWorkflowJson.read(rs.getString("workflow")));
    }

    /** Leniently: a signal a later version stored and this one doesn't know is dropped, not fatal. */
    private static List<Signal> readSignals(Array array) throws SQLException {
        if (array == null) {
            return List.of();
        }
        List<String> known = Arrays.stream(Signal.values()).map(Signal::wire).toList();
        return Signal.fromWire(Arrays.stream((String[]) array.getArray()).filter(known::contains).toList());
    }

    /** Leniently, like the signals: a subtype this version doesn't know reads as none (a spike's default). */
    private static SpikeSubtype readSubtype(String wire) {
        return Arrays.stream(SpikeSubtype.values()).filter(s -> s.wire().equals(wire)).findFirst().orElse(null);
    }

    /** Leniently too: a reason a later version stored and this one doesn't know reads as {@code other}. */
    private static CardRejection readRejection(ResultSet rs) throws SQLException {
        String reason = rs.getString("rejection_reason");
        if (reason == null) {
            return null;
        }
        String note = rs.getString("rejection_note");
        return new CardRejection(Arrays.stream(RejectionReason.values()).filter(r -> r.wire().equals(reason))
                .findFirst().orElse(RejectionReason.OTHER), note == null ? "" : note,
                rs.getObject("rejection_card_id", UUID.class));
    }
}
