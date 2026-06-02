FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    g++ \
    libpqxx-dev \
    libpq-dev \
    build-essential

WORKDIR /app

COPY . .

RUN g++ main.cpp database/db.cpp auth/auth.cpp buildings/buildings.cpp timetable/timetable.cpp server/routes.cpp \
    -o backend -lpqxx -lpq -lws2_32

EXPOSE 8080

CMD ["./backend"]