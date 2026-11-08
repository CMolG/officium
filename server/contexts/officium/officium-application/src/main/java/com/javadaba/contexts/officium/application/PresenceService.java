package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DevicePresence;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.PresenceRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * JAVA-1144: is the person looking at Officium right now? The web beats per device; an agent reads
 * the answer before it summons them. A device is open while its last beat is under {@link #OPEN_WINDOW}
 * old and it has not closed since: the web beats every 60 s, so one missed beat does not close it.
 */
@ApplicationScoped
public class PresenceService {

    static final Duration OPEN_WINDOW = Duration.ofSeconds(150);
    static final Duration RETENTION = Duration.ofDays(30);
    /** Devices kept per account (CWE-770): a client minting device ids costs only the oldest rows. */
    static final int MAX_DEVICES = 20;
    static final int MAX_LABEL_LENGTH = 60;

    private final PresenceRepository presence;
    private final Clock clock;

    @Inject
    public PresenceService(PresenceRepository presence) {
        this(presence, Clock.systemUTC());
    }

    PresenceService(PresenceRepository presence, Clock clock) {
        this.presence = presence;
        this.clock = clock;
    }

    public void beat(UUID accountId, UUID deviceId, boolean visible, boolean focused, String label) {
        if (deviceId == null) {
            throw OfficiumException.badRequest("device_required", "A beat names its device with a UUID");
        }
        Instant now = Instant.now(clock);
        presence.beat(accountId, deviceId, label(label), visible, focused, now);
        presence.prune(accountId, now.minus(RETENTION), MAX_DEVICES);
    }

    public void close(UUID accountId, UUID deviceId) {
        if (deviceId == null) {
            throw OfficiumException.badRequest("device_required", "A close beat names its device with a UUID");
        }
        presence.close(accountId, deviceId, Instant.now(clock));
    }

    /** The account's presence across its devices; {@code open} when any device is. */
    public Presence read(UUID accountId) {
        Instant now = Instant.now(clock);
        List<Device> devices = presence.list(accountId).stream()
                .sorted(Comparator.comparing(DevicePresence::lastSeenAt).reversed())
                .map(d -> Device.of(d, isOpen(d, now))).toList();
        List<Device> open = devices.stream().filter(Device::open).toList();
        return new Presence(!open.isEmpty(), open.stream().anyMatch(Device::visible),
                open.stream().anyMatch(Device::focused),
                devices.stream().map(Device::lastSeenAt).findFirst().orElse(null), devices);
    }

    private static boolean isOpen(DevicePresence device, Instant now) {
        return device.closedAt() == null && device.lastSeenAt().isAfter(now.minus(OPEN_WINDOW));
    }

    /** A coarse label (browser and OS family), cut and stripped of control characters; null when blank. */
    private static String label(String value) {
        if (value == null) {
            return null;
        }
        String clean = value.replaceAll("\\p{Cntrl}", "").strip();
        if (clean.isEmpty()) {
            return null;
        }
        return clean.length() > MAX_LABEL_LENGTH ? clean.substring(0, MAX_LABEL_LENGTH) : clean;
    }

    /** {@code visible} and {@code focused} count open devices only: a closed tab is neither. */
    public record Presence(boolean open, boolean visible, boolean focused, Instant lastSeenAt, List<Device> devices) {
    }

    public record Device(UUID deviceId, String label, boolean open, boolean visible, boolean focused,
            Instant firstSeenAt, Instant lastSeenAt) {

        static Device of(DevicePresence d, boolean open) {
            return new Device(d.deviceId(), d.label(), open, open && d.visible(), open && d.focused(),
                    d.firstSeenAt(), d.lastSeenAt());
        }
    }
}
