# Deploying the web demo to Azure

The simplest public demo: one Ubuntu VM runs the Docker Compose stack (SurrealDB, API, web)
behind [Caddy](https://caddyserver.com), which gets a Let's Encrypt certificate automatically.
Only the web app is public; the browser never talks to the API directly. The mobile app is not
supported here, because the API stays private.

| File                 | What it does                                                            |
| -------------------- | ----------------------------------------------------------------------- |
| `deploy.sh`          | Creates the resource group, the VM, its DNS name and firewall rules     |
| `cloud-init.yaml`    | On first boot: installs Docker, clones the repo, writes secrets, starts |
| `compose.azure.yaml` | Compose override: Caddy on 80/443, no other public ports, HTTPS cookies |
| `Caddyfile`          | HTTPS reverse proxy to the web app                                      |
| `update.sh`          | Redeploys a branch on the running VM                                    |

## Deploy

Needs the Azure CLI, signed in (`az login`) to the subscription to use.

```bash
deploy/azure/deploy.sh                    # main, as https://haven-hackyeah.polandcentral.cloudapp.azure.com
REF=my-branch deploy/azure/deploy.sh      # another branch
```

Settings (environment variables): `RG` (`haven-demo`), `LOCATION` (`polandcentral`), `DNS_LABEL`
(`haven-hackyeah`), `REF` (`main`), `SIZE` (`Standard_B2s`), `VM` (`haven-vm`).

The first boot takes about 10 minutes: Docker is installed and the images are built on the VM.
The database is migrated and seeded with the demo data and accounts. Follow it with:

```bash
ssh azureuser@haven-hackyeah.polandcentral.cloudapp.azure.com \
  'cloud-init status --wait && cd /opt/haven && docker compose ps'
```

SSH is open only to the IP address that ran `deploy.sh`. The database password and JWT secret are
generated on the VM, in `/opt/haven/.env`.

## Update

```bash
deploy/azure/update.sh                    # pulls main and rebuilds
REF=my-branch deploy/azure/update.sh
```

Data (reports, evidence, certificates) lives in Docker volumes and survives updates. For a clean
slate on the VM:

```bash
cd /opt/haven && docker compose -f compose.yaml -f deploy/azure/compose.azure.yaml \
  --profile full run --rm -e HAVEN_CONFIRM_RESET=yes migrate node dist/db/cli.js reset
```

## Tear down

A `Standard_B2s` VM costs roughly €35 a month while it runs. Delete everything after the demo:

```bash
az group delete -n haven-demo --yes
```
