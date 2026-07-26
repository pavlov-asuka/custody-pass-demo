ARG RUNTIME_IMAGE=eclipse-temurin:17-jre-jammy
FROM ${RUNTIME_IMAGE}

WORKDIR /app

COPY target/custody-training-*.jar /app/app.jar

ENV JAVA_OPTS=""

USER 10001:10001
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java ${JAVA_OPTS:-} -jar /app/app.jar"]
