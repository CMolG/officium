# Officium Local server: builds the Quarkus app, then runs it on a plain JRE.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /src
COPY . .
RUN ./mvnw -q -B package -DskipTests

FROM eclipse-temurin:25-jre
RUN useradd --system --create-home --uid 10001 officium
WORKDIR /app
COPY --from=build /src/apps/officium-local/target/quarkus-app/ /app/
USER officium
# Inside the container the server must listen on all interfaces; docker-compose publishes the
# port on 127.0.0.1 only.
ENV OFFICIUM_HTTP_HOST=0.0.0.0 \
    OFFICIUM_HTTP_PORT=8080
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseSerialGC", "-jar", "/app/quarkus-run.jar"]
