FROM maven:3.9.8-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml /app/pom.xml
COPY account-service /app/account-service
RUN mvn -pl account-service -am clean package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.5.0/opentelemetry-javaagent.jar /otel/opentelemetry-javaagent.jar
ENV JAVA_TOOL_OPTIONS="-javaagent:/otel/opentelemetry-javaagent.jar"
ENV OTEL_SERVICE_NAME=account-service
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
ENV OTEL_METRICS_EXPORTER=otlp
ENV OTEL_TRACES_EXPORTER=otlp
ENV OTEL_LOGS_EXPORTER=otlp
COPY --from=builder /app/account-service/target/account-service-1.0.0.jar app.jar
EXPOSE 7082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
