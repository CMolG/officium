package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.javadaba.contexts.officium.domain.ports.GithubUserAuthorization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * GitHub's web flow for the Officium GitHub App (JAVA-397), over {@code java.net.http}: the code is
 * exchanged with the App's client id and secret, and the user access token lists the installations
 * and their repositories. Both base URLs are configurable, so tests and the dev profile point them at
 * a stub ({@code OfficiumGithubStubResource}).
 */
@ApplicationScoped
public class HttpGithubUserAuthorization implements GithubUserAuthorization {

    /** GitHub's largest page; a listing shorter than this is the last one. */
    static final int PAGE = 100;
    /** 1,000 installations or repositories per installation is far past any account this serves. */
    static final int MAX_PAGES = 10;

    private final ObjectMapper json;
    private final Optional<String> clientId;
    private final Optional<String> clientSecret;
    private final Optional<String> appSlug;
    private final String webUrl;
    private final String apiUrl;
    private final String callbackUrl;
    private final HttpClient http;
    private final Duration timeout;

    @Inject
    public HttpGithubUserAuthorization(ObjectMapper json,
            @ConfigProperty(name = "javadaba.officium.github.client-id") Optional<String> clientId,
            @ConfigProperty(name = "javadaba.officium.github.client-secret") Optional<String> clientSecret,
            @ConfigProperty(name = "javadaba.officium.github.app-slug") Optional<String> appSlug,
            @ConfigProperty(name = "javadaba.officium.github.web-url", defaultValue = "https://github.com") String webUrl,
            @ConfigProperty(name = "javadaba.officium.github.api-url", defaultValue = "https://api.github.com") String apiUrl,
            @ConfigProperty(name = "javadaba.officium.github.callback-url", defaultValue = "https://javadaba.com/api/officium/v1/github/callback") String callbackUrl,
            @ConfigProperty(name = "javadaba.officium.github.timeout", defaultValue = "10s") Duration timeout) {
        this.json = json;
        this.clientId = clientId.filter(value -> !value.isBlank());
        this.clientSecret = clientSecret.filter(value -> !value.isBlank());
        this.appSlug = appSlug.filter(value -> !value.isBlank());
        this.webUrl = trimSlash(webUrl);
        this.apiUrl = trimSlash(apiUrl);
        this.callbackUrl = callbackUrl;
        this.timeout = timeout;
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    @Override
    public boolean configured() {
        return clientId.isPresent() && clientSecret.isPresent();
    }

    @Override
    public String authorizeUrl(String state) {
        return webUrl + "/login/oauth/authorize?" + form(Map.of("client_id", clientId.orElse(""),
                "redirect_uri", callbackUrl, "state", state));
    }

    @Override
    public Optional<String> installUrl(String state) {
        return appSlug.map(slug -> webUrl + "/apps/" + encode(slug) + "/installations/new?" + form(Map.of("state",
                state)));
    }

    @Override
    public List<Installation> installations(String code) {
        String token = exchange(code);
        List<Installation> installations = new ArrayList<>();
        for (JsonNode installation : pages("/user/installations", "installations", token)) {
            long id = installation.path("id").asLong();
            List<String> repos = new ArrayList<>();
            for (JsonNode repo : pages("/user/installations/" + id + "/repositories", "repositories", token)) {
                repos.add(repo.path("full_name").asText(""));
            }
            installations.add(new Installation(id, List.copyOf(repos)));
        }
        return installations;
    }

    /** The user access token for {@code code}. GitHub answers a bad code with 200 and an {@code error}. */
    private String exchange(String code) {
        HttpRequest request = HttpRequest.newBuilder(URI.create(webUrl + "/login/oauth/access_token"))
                .timeout(timeout)
                .header("Accept", "application/json")
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form(Map.of("client_id", clientId.orElse(""),
                        "client_secret", clientSecret.orElse(""), "code", code == null ? "" : code,
                        "redirect_uri", callbackUrl))))
                .build();
        JsonNode body = send(request, "exchange the authorization code");
        String token = body.path("access_token").asText("");
        if (token.isEmpty()) {
            throw new Rejected("GitHub refused the authorization code (" + body.path("error").asText("no token")
                    + ")");
        }
        return token;
    }

    private List<JsonNode> pages(String path, String field, String token) {
        List<JsonNode> items = new ArrayList<>();
        for (int page = 1; page <= MAX_PAGES; page++) {
            HttpRequest request = HttpRequest.newBuilder(URI.create(apiUrl + path + "?per_page=" + PAGE + "&page="
                    + page))
                    .timeout(timeout)
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();
            JsonNode listed = send(request, "list " + path).path(field);
            listed.forEach(items::add);
            if (listed.size() < PAGE) {
                break;
            }
        }
        return items;
    }

    /** The response's JSON. Never puts the request's headers or body in a message: one carries the token. */
    private JsonNode send(HttpRequest request, String what) {
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException ex) {
            throw new Unavailable("GitHub could not be reached to " + what, ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new Unavailable("Interrupted while asking GitHub to " + what, ex);
        }
        if (response.statusCode() == 401) {
            throw new Rejected("GitHub refused the user token while trying to " + what);
        }
        if (response.statusCode() / 100 != 2) {
            throw new Unavailable("GitHub answered " + response.statusCode() + " when asked to " + what, null);
        }
        try {
            return json.readTree(response.body());
        } catch (IOException ex) {
            throw new Unavailable("GitHub answered something that is not JSON when asked to " + what, ex);
        }
    }

    private static String form(Map<String, String> fields) {
        return fields.entrySet().stream().map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
                .collect(Collectors.joining("&"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String trimSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
