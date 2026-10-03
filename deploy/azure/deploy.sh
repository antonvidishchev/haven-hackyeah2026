#!/usr/bin/env bash
# Creates the Azure VM that runs the Haven web demo. See deploy/azure/README.md.
set -euo pipefail

RG=${RG:-haven-demo}
LOCATION=${LOCATION:-polandcentral}
DNS_LABEL=${DNS_LABEL:-haven-hackyeah}
REF=${REF:-main}
SIZE=${SIZE:-Standard_B2s}
VM=${VM:-haven-vm}

here=$(cd "$(dirname "$0")" && pwd)
domain="$DNS_LABEL.$LOCATION.cloudapp.azure.com"
my_ip=$(curl -fsS https://api.ipify.org)

rendered=$(mktemp)
trap 'rm -f "$rendered"' EXIT
sed -e "s|__HAVEN_DOMAIN__|$domain|g" -e "s|__HAVEN_REF__|$REF|g" \
  "$here/cloud-init.yaml" > "$rendered"

echo "Resource group $RG in $LOCATION"
az group create -n "$RG" -l "$LOCATION" -o none

echo "VM $VM ($SIZE), deploying $REF to https://$domain"
az vm create -g "$RG" -n "$VM" \
  --image Ubuntu2404 --size "$SIZE" \
  --admin-username azureuser --generate-ssh-keys \
  --public-ip-sku Standard --public-ip-address-dns-name "$DNS_LABEL" \
  --nsg-rule NONE --custom-data "$rendered" -o none

nsg="${VM}NSG"
az network nsg rule create -g "$RG" --nsg-name "$nsg" -n web --priority 100 \
  --access Allow --protocol '*' --destination-port-ranges 80 443 -o none
az network nsg rule create -g "$RG" --nsg-name "$nsg" -n ssh-deployer --priority 110 \
  --access Allow --protocol Tcp --destination-port-ranges 22 --source-address-prefixes "$my_ip" \
  -o none

cat <<MSG

Created. cloud-init now installs Docker and builds the images (about 10 minutes).
Follow it with:
  ssh azureuser@$domain 'cloud-init status --wait && cd /opt/haven && docker compose ps'
Then open https://$domain
MSG
