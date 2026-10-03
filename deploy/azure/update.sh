#!/usr/bin/env bash
# Redeploys a git ref on the Azure VM. See deploy/azure/README.md.
set -euo pipefail

LOCATION=${LOCATION:-polandcentral}
DNS_LABEL=${DNS_LABEL:-haven-hackyeah}
REF=${REF:-main}

ssh "azureuser@$DNS_LABEL.$LOCATION.cloudapp.azure.com" bash -s -- "$REF" <<'REMOTE'
set -euo pipefail
cd /opt/haven
git fetch --prune origin
git checkout "$1"
git reset --hard "origin/$1"
docker compose -f compose.yaml -f deploy/azure/compose.azure.yaml --profile full up -d --build
docker image prune -f
REMOTE
