package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.HeartbeatCode;
import com.javadaba.contexts.officium.domain.HeartbeatToken;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.HeartbeatCodeRepository;
import com.javadaba.contexts.officium.domain.ports.HeartbeatTokenRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * JAVA-186 (contract §4.2): liveness without model tokens. The harness's hooks beat with a heartbeat
 * token while an agent works, so a card stays lit -- and its time imputed -- through a long command
 * the model can't interrupt to report.
 *
 * <p>JAVA-675: one token per device, so a second machine never silences the first, and a machine gets
 * its own without the token passing through an agent: the MCP mints a one-time code
 * ({@link #setup}), and the command it answers trades the code for the token straight into a file.
 *
 * <p>JAVA-1425: a token or code the native app asks for carries its sign-in, and a code hands it to
 * the token it is redeemed into, so both end when the app signs out.
 */
@ApplicationScoped
public class HeartbeatService {

    /** Devices per account, bounded like agent windows (JAVA-561, CWE-770): a token costs only a free account. */
    static final int MAX_DEVICES = 20;
    /** Past the cap, the device seen longest ago makes room only when it has been silent this long. */
    static final Duration EVICTABLE_AFTER = Duration.ofHours(24);
    static final int MAX_LIVE_CODES = 5;
    static final Duration CODE_TTL = Duration.ofMinutes(10);
    /** A beat every few seconds stamps the last use once a minute, not on every beat. */
    static final Duration LAST_USE_RESOLUTION = Duration.ofMinutes(1);
    static final int MAX_MACHINE_LENGTH = 100;

    private final HeartbeatTokenRepository tokens;
    private final HeartbeatCodeRepository codes;
    private final AgentWorkService agentWork;
    private final String publicApiUrl;
    private final Clock clock;

    @Inject
    public HeartbeatService(HeartbeatTokenRepository tokens, HeartbeatCodeRepository codes, AgentWorkService agentWork,
            @ConfigProperty(name = "javadaba.officium.public-api-url", defaultValue = "https://javadaba.com/api") String publicApiUrl) {
        this(tokens, codes, agentWork, publicApiUrl, Clock.systemUTC());
    }

    HeartbeatService(HeartbeatTokenRepository tokens, HeartbeatCodeRepository codes, AgentWorkService agentWork,
            String publicApiUrl, Clock clock) {
        this.tokens = tokens;
        this.codes = codes;
        this.agentWork = agentWork;
        this.publicApiUrl = publicApiUrl.replaceAll("/+$", "");
        this.clock = clock;
    }

    /**
     * @param model  the model the agent runs on, as its transcript says (JAVA-584); null keeps the last
     * @param effort the effort it runs at; null keeps the last
     * @return the keys of the cards the beat kept alive; empty when the machine is working none.
     */
    public List<String> beat(String token, String machine, String text, String model, String effort) {
        UUID accountId = accountFor(token);
        if (machine == null || machine.isBlank()) {
            throw OfficiumException.badRequest("machine_required",
                    "Say which machine beats: the same name the agent passes as `machine`");
        }
        return agentWork.beat(accountId, machine.strip(), text, label(model, 100), label(effort, 20));
    }

    /** A short label from the harness, or null when blank; cut rather than refused, since a beat that
     *  failed over a label would leave the card dark. */
    private static String label(String value, int max) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String stripped = value.strip();
        return stripped.length() > max ? stripped.substring(0, max) : stripped;
    }

    /** A device's name as it will be shown on the web: no control characters, cut, null when blank. */
    private static String machine(String value) {
        return label(value == null ? null : value.replaceAll("\\p{Cntrl}", ""), MAX_MACHINE_LENGTH);
    }

    /** The account a heartbeat token belongs to; the harness's session report (JAVA-245) signs with it too. */
    public UUID accountFor(String token) {
        Instant now = Instant.now(clock);
        return (token == null || !token.startsWith(HeartbeatToken.PREFIX)
                ? Optional.<UUID>empty()
                : tokens.accountForTokenHash(HeartbeatToken.hash(token), now, now.minus(LAST_USE_RESOLUTION)))
                .orElseThrow(() -> new OfficiumException("invalid_token",
                        "This token keeps nothing alive: it is unknown or was revoked. Create a new one in "
                                + "Officium, under Connect an agent.",
                        401));
    }

    /** The account's devices, the one used most recently first. Never a token. */
    public List<Device> devices(UUID accountId) {
        return tokens.list(accountId).stream().map(Device::of).toList();
    }

    /** A new token for a new device of the account; the others keep working. The plain token is in
     *  this answer and nowhere else. */
    public IssuedToken issue(UUID accountId, String machine) {
        return issue(accountId, machine, null);
    }

    /** @param signInFamily the native app's sign-in asking for it, which it ends with; null from the web */
    public IssuedToken issue(UUID accountId, String machine, UUID signInFamily) {
        Instant now = Instant.now(clock);
        makeRoomForADevice(accountId, now);
        return save(accountId, machine(machine), now, signInFamily);
    }

    /** Stops that one device; 404 for an id that is not one of the account's. */
    public void revoke(UUID accountId, UUID deviceId) {
        if (deviceId == null || !tokens.delete(accountId, deviceId)) {
            throw OfficiumException.notFound("device_not_found", "No device of yours has that id");
        }
    }

    /**
     * What sets this machine's heartbeat up from an agent (MCP {@code heartbeat.setup}, and JAVA-563's
     * {@code harness.setup}): a one-time code, inside the one command that trades it for a token. The
     * code is the only secret the agent ever sees, and it buys one device, once, for ten minutes.
     */
    public Setup setup(UUID accountId) {
        return setup(accountId, null);
    }

    /** @param signInFamily the native app's sign-in asking for it, handed to the token it buys */
    public Setup setup(UUID accountId, UUID signInFamily) {
        return setup(accountId, signInFamily, publicApiUrl);
    }

    Setup setup(UUID accountId, UUID signInFamily, String apiBase) {
        Instant now = Instant.now(clock);
        codes.deleteExpired(now);
        if (codes.countLive(accountId, now) >= MAX_LIVE_CODES) {
            throw new OfficiumException("too_many_codes", "This account already has " + MAX_LIVE_CODES
                    + " setup codes waiting: run one of their commands, or wait ten minutes for them to lapse", 429);
        }
        String code = HeartbeatCode.PREFIX + randomHex();
        Instant expiresAt = now.plus(CODE_TTL);
        codes.save(new HeartbeatCode(UUID.randomUUID(), accountId, HeartbeatToken.hash(code), expiresAt, null, now,
                signInFamily));
        return new Setup(expiresAt, SetupCommand.of(apiBase.replaceAll("/+$", ""), code));
    }

    /**
     * {@code POST /heartbeat/tokens/redeem}: anonymous, rate-limited by IP. A code works once and for
     * ten minutes; every failure is the same 401, never saying whether it was unknown, spent or
     * expired. The device cap is checked before the code is spent, so a full account keeps its code.
     * The token inherits the code's sign-in, which the caller checks is still on (JAVA-1425).
     */
    public Redeemed redeem(String code, String machine) {
        Instant now = Instant.now(clock);
        HeartbeatCode found = (code == null || !code.strip().startsWith(HeartbeatCode.PREFIX)
                ? Optional.<HeartbeatCode>empty()
                : codes.findByCodeHash(HeartbeatToken.hash(code.strip())))
                .filter(candidate -> candidate.redeemableAt(now))
                .orElseThrow(HeartbeatService::invalidCode);
        makeRoomForADevice(found.accountId(), now);
        if (!codes.consume(found.id(), now)) {
            throw invalidCode();
        }
        return new Redeemed(save(found.accountId(), machine(machine), now, found.signInFamily()),
                found.signInFamily());
    }

    private IssuedToken save(UUID accountId, String machine, Instant now, UUID signInFamily) {
        String token = HeartbeatToken.PREFIX + randomHex() + randomHex();
        UUID id = UUID.randomUUID();
        tokens.save(new HeartbeatToken(id, accountId, HeartbeatToken.hash(token), machine, now, null, signInFamily));
        return new IssuedToken(id, machine, token, now);
    }

    private void makeRoomForADevice(UUID accountId, Instant now) {
        List<HeartbeatToken> mine = tokens.list(accountId);
        if (mine.size() < MAX_DEVICES) {
            return;
        }
        HeartbeatToken quietest = mine.stream().min(Comparator.comparing(HeartbeatToken::lastSeen)).orElseThrow();
        if (quietest.lastSeen().isAfter(now.minus(EVICTABLE_AFTER))) {
            throw new OfficiumException("too_many_devices", "This account already has " + MAX_DEVICES
                    + " devices that beat in the last day: revoke one under Connect an agent before adding another",
                    429);
        }
        tokens.delete(accountId, quietest.id());
    }

    /** 32 hex characters per call, from a UUID drawn now, as ChangelogService does: nothing random
     *  frozen into a native image (invariant 8). */
    private static String randomHex() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    private static OfficiumException invalidCode() {
        return new OfficiumException("invalid_code",
                "This setup code is not valid: codes work once, for 10 minutes. Ask Officium's MCP for a new one "
                        + "(heartbeat.setup)",
                401);
    }

    public record Device(UUID id, String machine, Instant createdAt, Instant lastUsedAt) {

        static Device of(HeartbeatToken token) {
            return new Device(token.id(), token.machine(), token.createdAt(), token.lastUsedAt());
        }
    }

    public record IssuedToken(UUID id, String machine, String token, Instant createdAt) {
    }

    /** A redeemed code's token, and the sign-in it inherited (never sent to the machine). */
    public record Redeemed(IssuedToken token, UUID signInFamily) {
    }

    /** The code is inside {@code command} and nowhere else in the answer. */
    public record Setup(Instant expiresAt, String command) {
    }
}
