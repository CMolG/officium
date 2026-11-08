package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.PriorFailureSettings;
import com.javadaba.contexts.officium.domain.ProfileRecommendationSettings;
import com.javadaba.contexts.officium.domain.ports.QualitySettingsRepository;
import jakarta.enterprise.context.ApplicationScoped;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * The per-project quality settings (card://JAVA-1803), {@code officium_project_quality_settings}: one jsonb per project,
 * a key per feature. The prior-failure read is {@code priorFailures}; it is read field by field in SQL, so no mapper
 * sees the document.
 */
@ApplicationScoped
public class JdbcQualitySettingsRepository implements QualitySettingsRepository {

    private static final String READ = "select (settings -> 'priorFailures' ->> 'windowDays')::int as window_days, "
            + "(settings -> 'priorFailures' ->> 'maxCards')::int as max_cards, "
            + "(settings -> 'priorFailures' ->> 'maxFindings')::int as max_findings, "
            + "(settings -> 'priorFailures' ->> 'recurrenceThreshold')::int as recurrence_threshold "
            + "from officium_project_quality_settings where project_id = ? and settings -> 'priorFailures' is not null";

    private static final String UPSERT = "insert into officium_project_quality_settings (project_id, settings, "
            + "updated_at, updated_by) values (?, jsonb_build_object('priorFailures', cast(? as jsonb)), ?, cast(? as jsonb)) "
            + "on conflict (project_id) do update set settings = jsonb_set(officium_project_quality_settings.settings, "
            + "'{priorFailures}', cast(? as jsonb)), updated_at = excluded.updated_at, updated_by = excluded.updated_by";

    private static final String RESET = "update officium_project_quality_settings set settings = settings - 'priorFailures', "
            + "updated_at = ?, updated_by = cast(? as jsonb) where project_id = ?";

    private static final String READ_PROFILE = "select (settings -> 'profileRecommendations' ->> 'raiseAt')::float8 "
            + "as raise_at from officium_project_quality_settings where project_id = ? "
            + "and settings -> 'profileRecommendations' is not null";

    private static final String UPSERT_PROFILE = "insert into officium_project_quality_settings (project_id, settings, "
            + "updated_at, updated_by) values (?, jsonb_build_object('profileRecommendations', cast(? as jsonb)), ?, "
            + "cast(? as jsonb)) on conflict (project_id) do update set settings = jsonb_set(officium_project_quality_settings"
            + ".settings, '{profileRecommendations}', cast(? as jsonb)), updated_at = excluded.updated_at, "
            + "updated_by = excluded.updated_by";

    private static final String RESET_PROFILE = "update officium_project_quality_settings "
            + "set settings = settings - 'profileRecommendations', updated_at = ?, updated_by = cast(? as jsonb) "
            + "where project_id = ?";

    private final DataSource dataSource;

    public JdbcQualitySettingsRepository(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public Optional<PriorFailureSettings> priorFailures(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(READ)) {
            statement.setObject(1, projectId);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next()
                        ? Optional.of(PriorFailureSettings.of(rows.getObject("window_days", Integer.class),
                                rows.getObject("max_cards", Integer.class),
                                rows.getObject("max_findings", Integer.class),
                                rows.getObject("recurrence_threshold", Integer.class)))
                        : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the quality settings", ex);
        }
    }

    @Override
    public void savePriorFailures(UUID projectId, PriorFailureSettings settings, Actor by, Instant at) {
        String document = String.format(
                "{\"windowDays\":%d,\"maxCards\":%d,\"maxFindings\":%d,\"recurrenceThreshold\":%d}",
                settings.windowDays(), settings.maxCards(), settings.maxFindings(), settings.recurrenceThreshold());
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UPSERT)) {
            statement.setObject(1, projectId);
            statement.setString(2, document);
            statement.setTimestamp(3, Timestamp.from(at));
            statement.setString(4, OfficiumJson.writeActor(by));
            statement.setString(5, document);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the quality settings", ex);
        }
    }

    @Override
    public void resetPriorFailures(UUID projectId, Actor by, Instant at) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RESET)) {
            statement.setTimestamp(1, Timestamp.from(at));
            statement.setString(2, OfficiumJson.writeActor(by));
            statement.setObject(3, projectId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to reset the quality settings", ex);
        }
    }

    @Override
    public Optional<ProfileRecommendationSettings> profileRecommendations(UUID projectId) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(READ_PROFILE)) {
            statement.setObject(1, projectId);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next()
                        ? Optional.of(ProfileRecommendationSettings.of(rows.getObject("raise_at", Double.class)))
                        : Optional.empty();
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the quality settings", ex);
        }
    }

    @Override
    public void saveProfileRecommendations(UUID projectId, ProfileRecommendationSettings settings, Actor by,
            Instant at) {
        String document = String.format("{\"raiseAt\":%s}", settings.raiseAt());
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(UPSERT_PROFILE)) {
            statement.setObject(1, projectId);
            statement.setString(2, document);
            statement.setTimestamp(3, Timestamp.from(at));
            statement.setString(4, OfficiumJson.writeActor(by));
            statement.setString(5, document);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to save the quality settings", ex);
        }
    }

    @Override
    public void resetProfileRecommendations(UUID projectId, Actor by, Instant at) {
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement(RESET_PROFILE)) {
            statement.setTimestamp(1, Timestamp.from(at));
            statement.setString(2, OfficiumJson.writeActor(by));
            statement.setObject(3, projectId);
            statement.executeUpdate();
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to reset the quality settings", ex);
        }
    }
}
