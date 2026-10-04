# Legacy Python lab

This is the original minimal, stdlib-only Python lab (API + fan-out worker hitting
Redis directly, no outbox/queue broker) used to *feel* the celebrity fan-out
storm firsthand. It's kept here for reference.

Run it standalone:

```
cd legacy-python-lab
docker compose up --build
```

The real, HLD-complete implementation (Next.js + Express + Postgres outbox +
Kafka + Redis + MinIO + nginx) now lives at the repo root — see the top-level
[README.md](../README.md) and `docker-compose.yml`.
