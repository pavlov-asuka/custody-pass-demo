package com.ccb.custodytraining;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import com.ccb.custodytraining.model.ModelClientException;
import com.ccb.custodytraining.model.ModelProperties;
import com.ccb.custodytraining.model.OpenAiCompatibleModelClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.BindException;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

class OpenAiModelClientTests {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void readsContentAndPreservesBasePathAndSendsOptionalHeaders() throws Exception {
        AtomicReference<String> path = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> userId = new AtomicReference<>();
        start(exchange -> {
            path.set(exchange.getRequestURI().getPath());
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            userId.set(exchange.getRequestHeaders().getFirst("X-User-ID"));
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"{\\\"ok\\\":true}\"}}]}");
        });

        ModelProperties properties = properties(serverUrl() + "/v1/");
        properties.setSendUserIdHeader(true);
        String result = new OpenAiCompatibleModelClient(objectMapper, properties)
                .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2));

        assertEquals("{\"ok\":true}", result);
        assertEquals("/v1/chat/completions", path.get());
        assertEquals("Bearer test-secret", authorization.get());
        assertEquals("EMP-TEST", userId.get());
    }

    @Test
    void doesNotSendUserHeaderWhenDisabled() {
        AtomicReference<String> userId = new AtomicReference<>("present");
        start(exchange -> {
            userId.set(exchange.getRequestHeaders().getFirst("X-User-ID"));
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}");
        });

        ModelProperties properties = properties(serverUrl());
        properties.setSendUserIdHeader(false);
        new OpenAiCompatibleModelClient(objectMapper, properties)
                .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2));

        assertFalse(userId.get() != null);
    }

    @Test
    void defaultThinkingModeOmitsThinkingField() {
        AtomicReference<JsonNode> requestBody = new AtomicReference<>();
        start(exchange -> {
            requestBody.set(objectMapper.readTree(exchange.getRequestBody()));
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}");
        });

        new OpenAiCompatibleModelClient(objectMapper, properties(serverUrl()))
                .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2));

        assertFalse(requestBody.get().has("thinking"));
        assertFalse(requestBody.get().has("reasoning_effort"));
    }

    @Test
    void enabledAndDisabledThinkingModesSendExpectedObject() {
        List<JsonNode> requestBodies = new ArrayList<>();
        start(exchange -> {
            requestBodies.add(objectMapper.readTree(exchange.getRequestBody()));
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}");
        });

        ModelProperties enabled = properties(serverUrl());
        enabled.setThinkingMode(ModelProperties.ThinkingMode.ENABLED);
        new OpenAiCompatibleModelClient(objectMapper, enabled)
                .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2));

        ModelProperties disabled = properties(serverUrl());
        disabled.setThinkingMode(ModelProperties.ThinkingMode.DISABLED);
        new OpenAiCompatibleModelClient(objectMapper, disabled)
                .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2));

        assertEquals("enabled", requestBodies.get(0).path("thinking").path("type").asText());
        assertEquals("disabled", requestBodies.get(1).path("thinking").path("type").asText());
        assertFalse(requestBodies.get(0).has("reasoning_effort"));
        assertFalse(requestBodies.get(1).has("reasoning_content"));
    }

    @Test
    void invalidThinkingModeFailsConfigurationBinding() {
        MapConfigurationPropertySource source = new MapConfigurationPropertySource();
        source.put("app.model.thinking-mode", "unsupported");

        assertThrows(BindException.class, () -> new Binder(source)
                .bind("app.model", Bindable.of(ModelProperties.class)));
    }

    @Test
    void rejectsHttpErrorWithoutReturningGatewayBody() {
        String secret = "gateway-secret-must-not-leak";
        start(exchange -> respond(exchange, 401, secret));

        ModelClientException exception = assertThrows(ModelClientException.class,
                () -> new OpenAiCompatibleModelClient(objectMapper, properties(serverUrl()))
                        .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2)));

        assertFalse(exception.getMessage().contains(secret));
        assertEquals("HTTP_STATUS_401", exception.errorType());
    }

    @Test
    void rejectsBaseUrlWithEmbeddedUserInfo() {
        ModelProperties properties = properties("http://user:pass@127.0.0.1");

        IllegalStateException exception = assertThrows(IllegalStateException.class,
                () -> new OpenAiCompatibleModelClient(objectMapper, properties));

        assertEquals("模型服务地址配置无效", exception.getMessage());
    }

    @Test
    void rejectsEmptyContent() {
        start(exchange -> respond(exchange, 200,
                "{\"choices\":[{\"message\":{\"content\":\"\"}}]" + "}"));

        ModelClientException exception = assertThrows(ModelClientException.class,
                () -> new OpenAiCompatibleModelClient(objectMapper, properties(serverUrl()))
                        .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2)));
        assertEquals("EMPTY_CONTENT", exception.errorType());
    }

    @Test
    void rejectsOversizedResponse() {
        String oversized = "{\"choices\":[{\"message\":{\"content\":\""
                + "x".repeat(200_001) + "\"}}]}";
        start(exchange -> respond(exchange, 200, oversized));

        ModelClientException exception = assertThrows(ModelClientException.class,
                () -> new OpenAiCompatibleModelClient(objectMapper, properties(serverUrl()))
                        .complete("system", "user", "EMP-TEST", Duration.ofSeconds(2)));
        assertEquals("RESPONSE_TOO_LARGE", exception.errorType());
    }

    @Test
    void rejectsTimeoutWithinRemainingBudget() {
        start(exchange -> {
            try {
                Thread.sleep(600L);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"ok\"}}]}");
        });

        ModelProperties properties = properties(serverUrl());
        properties.setConnectTimeout(Duration.ofSeconds(1));
        ModelClientException exception = assertThrows(ModelClientException.class,
                () -> new OpenAiCompatibleModelClient(objectMapper, properties)
                        .complete("system", "user", "EMP-TEST", Duration.ofMillis(100)));
        assertEquals("TIMEOUT", exception.errorType());
    }

    private ModelProperties properties(String baseUrl) {
        ModelProperties properties = new ModelProperties();
        properties.setBaseUrl(baseUrl);
        properties.setApiKey("test-secret");
        properties.setModelName("test-model");
        properties.setReviewTimeBudget(Duration.ofSeconds(2));
        return properties;
    }

    private void start(com.sun.net.httpserver.HttpHandler handler) {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", handler);
            server.start();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private String serverUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
