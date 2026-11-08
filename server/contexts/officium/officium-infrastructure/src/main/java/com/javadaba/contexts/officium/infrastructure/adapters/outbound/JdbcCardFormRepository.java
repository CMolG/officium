package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.CardForm;
import com.javadaba.contexts.officium.domain.CardFormAnswer;
import com.javadaba.contexts.officium.domain.ports.CardFormRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class JdbcCardFormRepository implements CardFormRepository {

    private static final String SELECT = "select id, project_id, card_id, form_id, slug, question_count, created_at "
            + "from officium_card_form";

    private final DataSource dataSource;

    public JdbcCardFormRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public boolean insert(CardForm form) {
        String sql = "insert into officium_card_form (id, project_id, card_id, form_id, slug, question_count, "
                + "created_at) values (?, ?, ?, ?, ?, ?, ?) on conflict (card_id) do nothing";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, form.id());
            statement.setObject(2, form.projectId());
            statement.setObject(3, form.cardId());
            statement.setObject(4, form.formId());
            statement.setString(5, form.slug());
            statement.setInt(6, form.questionCount());
            statement.setTimestamp(7, Timestamp.from(form.createdAt()));
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert card form for " + form.cardId(), ex);
        }
    }

    @Override
    public Optional<CardForm> findByCard(UUID cardId) {
        return findOne(SELECT + " where card_id = ?", cardId);
    }

    @Override
    public Optional<CardForm> findByFormId(UUID formId) {
        return findOne(SELECT + " where form_id = ?", formId);
    }

    @Override
    public java.util.Map<UUID, Integer> questionCounts(java.util.Collection<UUID> cardIds) {
        if (cardIds.isEmpty()) {
            return java.util.Map.of();
        }
        java.util.Map<UUID, Integer> counts = new java.util.HashMap<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select card_id, question_count from officium_card_form where card_id = any (?)")) {
            statement.setArray(1, connection.createArrayOf("uuid", cardIds.toArray()));
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    counts.put(rs.getObject("card_id", UUID.class), rs.getInt("question_count"));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the card forms of " + cardIds.size() + " cards", ex);
        }
        return counts;
    }

    @Override
    public void setQuestionCount(UUID cardFormId, int questionCount) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "update officium_card_form set question_count = ? where id = ?")) {
            statement.setInt(1, questionCount);
            statement.setObject(2, cardFormId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to update card form " + cardFormId, ex);
        }
    }

    @Override
    public boolean insertAnswer(CardFormAnswer answer) {
        String sql = "insert into officium_card_form_answer (id, card_form_id, response_id, respondent_account_id, "
                + "respondent_name, answers, answered_at, lang) values (?, ?, ?, ?, ?, ?::jsonb, ?, ?) "
                + "on conflict (response_id) do nothing";
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, answer.id());
            statement.setObject(2, answer.cardFormId());
            statement.setObject(3, answer.responseId());
            statement.setObject(4, answer.respondentAccountId());
            statement.setString(5, answer.respondentName());
            statement.setString(6, OfficiumJson.writeAnswers(answer.answers()));
            statement.setTimestamp(7, Timestamp.from(answer.answeredAt()));
            statement.setString(8, answer.lang());
            return statement.executeUpdate() == 1;
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to insert the answer to " + answer.cardFormId(), ex);
        }
    }

    @Override
    public List<CardFormAnswer> answers(UUID cardFormId) {
        List<CardFormAnswer> result = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(
                        "select id, card_form_id, response_id, respondent_account_id, respondent_name, "
                                + "answers::text as answers, answered_at, lang from officium_card_form_answer "
                                + "where card_form_id = ? order by answered_at, id")) {
            statement.setObject(1, cardFormId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    result.add(new CardFormAnswer(rs.getObject("id", UUID.class),
                            rs.getObject("card_form_id", UUID.class), rs.getObject("response_id", UUID.class),
                            rs.getObject("respondent_account_id", UUID.class), rs.getString("respondent_name"),
                            OfficiumJson.readAnswers(rs.getString("answers")),
                            rs.getTimestamp("answered_at").toInstant(), rs.getString("lang")));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to list the answers of " + cardFormId, ex);
        }
        return result;
    }

    private Optional<CardForm> findOne(String sql, UUID key) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setObject(1, key);
            try (ResultSet rs = statement.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                return Optional.of(new CardForm(rs.getObject("id", UUID.class), rs.getObject("project_id", UUID.class),
                        rs.getObject("card_id", UUID.class), rs.getObject("form_id", UUID.class),
                        rs.getString("slug"), rs.getInt("question_count"),
                        rs.getTimestamp("created_at").toInstant()));
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read a card form", ex);
        }
    }
}
