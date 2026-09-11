# ============================================================
#  Dockerfile del backend (Spring Boot) para desplegar en Render.
#  En Render: Root Directory = backend  /  Runtime = Docker
# ============================================================

# ---- Etapa 1: compilar el .jar con Maven ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# ---- Etapa 2: imagen liviana de ejecucion ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Ajustes de memoria para el contenedor de Render (512 MB y medio CPU).
#
#   MaxRAMPercentage=50   La aplicacion no llega a usar 40 MB de heap ni con el
#                         evento entero encima, asi que 256 MB sobran. Con el
#                         75 % anterior la JVM se quedaba con casi todo el
#                         contenedor aunque no lo necesitara, y quedaba al
#                         borde del limite.
#   MaxMetaspaceSize      Pone techo a la memoria de las clases cargadas.
#   Xss512k               Pilas de hilo mas chicas: hay muchos hilos atendiendo.
#   UseSerialGC           Con medio CPU conviene el recolector mas simple: no
#                         levanta hilos que compitan por ese poco procesador.
#   ExitOnOutOfMemoryError Si algun dia faltara memoria, el contenedor reinicia
#                         limpio en vez de quedarse colgado.
ENTRYPOINT ["java",   "-XX:MaxRAMPercentage=50.0",   "-XX:MaxMetaspaceSize=128m",   "-Xss512k",   "-XX:+UseSerialGC",   "-XX:+ExitOnOutOfMemoryError",   "-jar", "app.jar"]
