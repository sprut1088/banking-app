FROM maven:3.9.8-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml /app/pom.xml
COPY gateway-service /app/gateway-service
COPY auth-service /app/auth-service
COPY account-service /app/account-service
COPY transaction-service /app/transaction-service
COPY card-service /app/card-service
COPY payment-service /app/payment-service
RUN mvn -pl account-service -am clean package spring-boot:repackage -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.5.0/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar
COPY --from=builder /app/account-service/target/account-service-1.0.0.jar app.jar
ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "app.jar"]
