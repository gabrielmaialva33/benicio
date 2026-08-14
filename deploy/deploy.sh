#!/usr/bin/env bash
#
# Deploys the checkout at /opt/benicio and waits until the app reports healthy.
# Runs on the server — from the CI workflow over SSH, or by hand.
#
#   ./deploy/deploy.sh                  # build + restart at origin/master
#   ./deploy/deploy.sh --ref <sha>      # pin a specific commit
#   ./deploy/deploy.sh --seed           # also run the seeders (first deploy)
#
# Migrations are not run here: the image CMD runs `migration:run --force`
# before the HTTP server starts, so every boot converges on its own.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/benicio}"
BRANCH="${BRANCH:-master}"
TARGET_REF=""
RUN_SEED="no"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ref)
      TARGET_REF="$2"
      shift 2
      ;;
    --seed)
      RUN_SEED="yes"
      shift
      ;;
    *)
      echo "deploy: unknown argument $1" >&2
      exit 2
      ;;
  esac
done

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "deploy: $APP_DIR/.env is missing — generate it with deploy/make_env.sh and copy it over" >&2
  exit 1
fi

# --env-file is not optional here. Compose resolves `${...}` interpolation
# against the project directory, which is the compose file's own folder, so
# without this it would look for deploy/.env and silently hand Postgres an
# empty password.
COMPOSE=(docker compose --env-file "$APP_DIR/.env" -f deploy/docker-compose.prod.yml)

echo "==> fetching $BRANCH"
git fetch --prune origin "$BRANCH"
git checkout --force "${TARGET_REF:-origin/$BRANCH}"
echo "==> deploying $(git rev-parse --short HEAD)"

echo "==> building and starting"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> waiting for the app to report healthy"
for _ in $(seq 1 60); do
  status="$("${COMPOSE[@]}" ps app --format '{{.Health}}' 2>/dev/null || echo unknown)"
  case "$status" in
    healthy)
      echo "==> app is healthy"
      break
      ;;
    unhealthy)
      echo "deploy: app went unhealthy — last log lines:" >&2
      "${COMPOSE[@]}" logs --tail 80 app >&2
      exit 1
      ;;
  esac
  sleep 5
done

if [[ "${status:-}" != "healthy" ]]; then
  echo "deploy: app never became healthy — last log lines:" >&2
  "${COMPOSE[@]}" logs --tail 80 app >&2
  exit 1
fi

if [[ "$RUN_SEED" == "yes" ]]; then
  # The seeders are tagged `environment = ['development']` because they carry
  # demo data. Forcing NODE_ENV for this one-off run is what lets the demo
  # dataset land on the server without loosening that guard in the code.
  echo "==> seeding (base access + legal demo + precatórios demo)"
  "${COMPOSE[@]}" run --rm --no-deps -e NODE_ENV=development app node ace.js db:seed
fi

echo "==> pruning dangling build layers"
docker image prune -f >/dev/null

echo "==> done: $(git rev-parse --short HEAD)"
