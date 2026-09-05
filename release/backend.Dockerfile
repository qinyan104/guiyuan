FROM eclipse-temurin:17-jre-alpine

# Runtime dependencies: curl for health checks, mariadb-client for backup/restore commands.
RUN apk add --no-cache curl mariadb-client

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Directly copy pre-built jar from local backend/target (0s download)
COPY backend/target/*.jar app.jar

RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError"

HEALTHCHECK --interval=15s --timeout=5s --retries=6 --start-period=40s \
  CMD curl -fsS http://localhost:8080/api/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
