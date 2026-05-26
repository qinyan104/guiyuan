# ─── Stage 1: Build with Maven ───
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build

# Cache dependencies layer (pom.xml changes less often than sources)
COPY backend/pom.xml .
RUN mvn dependency:go-offline -q

COPY backend/src src/
RUN mvn package -DskipTests -DskipITs -q && \
    cp target/*.jar app.jar

# ─── Stage 2: Runtime ───
FROM eclipse-temurin:17-jre-alpine

# Minimal runtime dependencies
RUN apk add --no-cache curl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY --from=build /build/app.jar app.jar

RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError"

HEALTHCHECK --interval=15s --timeout=5s --retries=6 --start-period=40s \
  CMD curl -fsS http://localhost:8080/api/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
