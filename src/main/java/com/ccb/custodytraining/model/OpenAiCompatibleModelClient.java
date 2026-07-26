package com.ccb.custodytraining.model;

import java.io.IOException;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OpenAiCompatibleModelClient implements ModelChatClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(OpenAiCompatibleModelClient.class);
    private static final int MAX_RESPONSE_BYTES = 200_000;

    private final ObjectMapper objectMapper;
    private final ModelProperties properties;
    private final HttpClient httpClient;
    private final URI endpoint;

    public OpenAiCompatibleModelClient(ObjectMapper objectMapper, ModelProperties properties) {
        this.objectMapper = objectMapper;
        this.properties = properties;
        properties.validateForOpenAi();
        this.endpoint = buildEndpoint(properties.getBaseUrl(), properties.getChatPath());
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.getConnectTimeout())
                .build();
    }

    @Override
    public String mode() {
        return "OPENAI_COMPATIBLE";
    }

    @Override
    public String complete(String systemPrompt, String userPrompt, String callerExternalId,
                           Duration remainingBudget) {
        if (remainingBudget == null || remainingBudget.isNegative() || remainingBudget.isZero()) {
            throw new ModelClientException("TIME_BUDGET_EXHAUSTED");
        }
        if (properties.isSendUserIdHeader()
                && (callerExternalId == null || callerExternalId.trim().isEmpty())) {
            throw new ModelClientException("CALLER_ID_REQUIRED");
        }

        long started = System.nanoTime();
        try {
            Thinking thinking = properties.getThinkingMode() == ModelProperties.ThinkingMode.OMIT
                    ? null : new Thinking(properties.getThinkingMode().wireValue());
            String requestJson = objectMapper.writeValueAsString(new ChatCompletionRequest(
                    properties.getModelName(),
                    new Message[]{new Message("system", systemPrompt), new Message("user", userPrompt)},
                    properties.getTemperature(), properties.getMaxTokens(), false, thinking));
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(endpoint)
                    .timeout(remainingBudget)
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson, StandardCharsets.UTF_8));
            if (properties.isSendUserIdHeader()) {
                requestBuilder.header("X-User-ID", callerExternalId);
            }

            HttpResponse<InputStream> response = httpClient.send(
                    requestBuilder.build(), HttpResponse.BodyHandlers.ofInputStream());
            try (InputStream responseStream = response.body()) {
                if (response.statusCode() < 200 || response.statusCode() >= 300) {
                    throw new ModelClientException("HTTP_STATUS_" + response.statusCode());
                }
                String body = readResponseBody(responseStream);
                String content = parseContent(body);
                if (content == null || content.trim().isEmpty()) {
                    throw new ModelClientException("EMPTY_CONTENT");
                }
                LOGGER.debug("模型调用完成 mode=OPENAI_COMPATIBLE elapsedMs={}", elapsedMillis(started));
                return content;
            }
        } catch (ModelClientException exception) {
            LOGGER.warn("模型调用失败 type={} elapsedMs={}", exception.errorType(), elapsedMillis(started));
            throw exception;
        } catch (HttpTimeoutException exception) {
            LOGGER.warn("模型调用失败 type=TIMEOUT elapsedMs={}", elapsedMillis(started));
            throw new ModelClientException("TIMEOUT", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            LOGGER.warn("模型调用失败 type=INTERRUPTED elapsedMs={}", elapsedMillis(started));
            throw new ModelClientException("INTERRUPTED", exception);
        } catch (IOException | RuntimeException exception) {
            LOGGER.warn("模型调用失败 type=TRANSPORT_OR_SERIALIZATION elapsedMs={}", elapsedMillis(started));
            throw new ModelClientException("TRANSPORT_OR_SERIALIZATION", exception);
        }
    }

    private String readResponseBody(InputStream inputStream) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream(Math.min(MAX_RESPONSE_BYTES, 8192));
        byte[] buffer = new byte[8192];
        int total = 0;
        int read;
        while ((read = inputStream.read(buffer, 0,
                Math.min(buffer.length, MAX_RESPONSE_BYTES - total + 1))) != -1) {
            total += read;
            if (total > MAX_RESPONSE_BYTES) {
                throw new ModelClientException("RESPONSE_TOO_LARGE");
            }
            output.write(buffer, 0, read);
        }
        return output.toString(StandardCharsets.UTF_8);
    }

    private String parseContent(String body) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            return content.isTextual() ? content.textValue() : null;
        } catch (JsonProcessingException exception) {
            throw new ModelClientException("INVALID_RESPONSE_JSON", exception);
        }
    }

    private static URI buildEndpoint(String baseUrl, String chatPath) {
        try {
            URI base = URI.create(baseUrl.trim());
            if (!("http".equalsIgnoreCase(base.getScheme())
                    || "https".equalsIgnoreCase(base.getScheme()))
                    || base.getHost() == null || base.getRawQuery() != null
                    || base.getRawFragment() != null || base.getUserInfo() != null) {
                throw new IllegalArgumentException();
            }
            if (chatPath == null || chatPath.isBlank() || !chatPath.startsWith("/")
                    || chatPath.startsWith("//") || chatPath.contains("?")
                    || chatPath.contains("#")) {
                throw new IllegalArgumentException();
            }
            String basePath = base.getPath() == null ? "" : base.getPath();
            String normalizedBase = basePath.endsWith("/")
                    ? basePath.substring(0, basePath.length() - 1) : basePath;
            String combinedPath = normalizedBase + chatPath;
            return new URI(base.getScheme(), null, base.getHost(), base.getPort(),
                    combinedPath, null, null);
        } catch (IllegalArgumentException | java.net.URISyntaxException exception) {
            throw new IllegalStateException("模型服务地址配置无效");
        }
    }

    private static long elapsedMillis(long started) {
        return Duration.ofNanos(System.nanoTime() - started).toMillis();
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private record ChatCompletionRequest(String model, Message[] messages, double temperature,
                                         int max_tokens, boolean stream, Thinking thinking) {
    }

    private record Message(String role, String content) {
    }

    private record Thinking(String type) {
    }
}
