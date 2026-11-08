package com.javadaba.apps.api.sse;

import jakarta.ws.rs.sse.Sse;
import jakarta.ws.rs.sse.SseEventSink;

import java.util.List;

/** The one way app-api keeps a server-sent stream open (lifted out of Officium's events, JAVA-1619). */
public final class SseKeepAlive {

    private SseKeepAlive() {
    }

    /**
     * No SseEventSink#onClose in the JAX-RS API: the heartbeat loop is what notices the client is
     * gone (isClosed() flips once the connection drops) and is therefore also where the broadcaster
     * subscriptions get torn down -- one thread per connection is the cost of a portable disconnect
     * signal.
     */
    public static void keepAlive(SseEventSink sink, Sse sse, long heartbeatMillis, String threadName,
            List<AutoCloseable> subscriptions) {
        Thread.ofVirtual().name(threadName).start(() -> {
            try {
                while (!sink.isClosed()) {
                    Thread.sleep(heartbeatMillis);
                    if (!sink.isClosed()) {
                        sink.send(sse.newEventBuilder().comment("heartbeat").build());
                    }
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            } finally {
                for (AutoCloseable subscription : subscriptions) {
                    try {
                        subscription.close();
                    } catch (Exception ignored) {
                        // close() only ever removes a listener from a list; never fails.
                    }
                }
            }
        });
    }
}
