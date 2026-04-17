#!/usr/bin/env bash
# Wires up custom domains + Zero Trust Access for both Pages projects.
# Token is pulled from macOS Keychain — never embedded, never logged.
# Idempotent: safe to re-run.
set -euo pipefail

ACCOUNT_ID="8e8aa1cbf30faaf422ef2491d832b0b7"
DOMAIN="evenpathhomes.com"
OWNER_EMAIL="isethius@gmail.com"
PROJECTS=("andrew" "alexander")
KEYCHAIN_SERVICE="cf-token-comeback"

API="https://api.cloudflare.com/client/v4"

have() { command -v "$1" >/dev/null 2>&1; }
for bin in security curl jq; do have "$bin" || { echo "missing: $bin"; exit 1; }; done

TOKEN=$(security find-generic-password -a "$USER" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null || true)
if [ -z "${TOKEN:-}" ]; then
  echo "No Cloudflare token in Keychain."
  echo "Store it with:"
  echo "  read -rs -p 'Paste CF token: ' T && echo && security add-generic-password -a \"\$USER\" -s \"$KEYCHAIN_SERVICE\" -l 'Comeback Tracker CF Token' -w \"\$T\" -U && unset T"
  exit 1
fi

cf() {
  local method=$1 path=$2 body=${3:-}
  if [ -n "$body" ]; then
    curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "$API$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json"
  fi
}

die() { echo "FAIL: $*"; exit 1; }

echo "==> Verifying token"
cf GET /user/tokens/verify | jq -e '.success' >/dev/null || die "token invalid"
echo "    ok"

echo "==> Looking up zone: $DOMAIN"
ZONE_ID=$(cf GET "/zones?name=$DOMAIN" | jq -r '.result[0].id // empty')
[ -n "$ZONE_ID" ] || die "zone $DOMAIN not found"
echo "    zone=$ZONE_ID"

for short in "${PROJECTS[@]}"; do
  project="comeback-$short"
  fqdn="$project.$DOMAIN"
  pretty="$(tr '[:lower:]' '[:upper:]' <<<"${short:0:1}")${short:1}"
  appname="Comeback Tracker - $pretty"

  echo ""
  echo "==> [$project] $fqdn"

  # 1. DNS CNAME (proxied)
  existing=$(cf GET "/zones/$ZONE_ID/dns_records?name=$fqdn&type=CNAME" | jq -r '.result[0].id // empty')
  if [ -n "$existing" ]; then
    echo "    DNS:    exists"
  else
    body=$(jq -n --arg n "$project" --arg c "$project.pages.dev" \
      '{type:"CNAME",name:$n,content:$c,proxied:true,ttl:1,comment:"comeback-tracker"}')
    res=$(cf POST "/zones/$ZONE_ID/dns_records" "$body")
    echo "$res" | jq -e '.success' >/dev/null || die "DNS create failed: $(echo "$res" | jq -c .errors)"
    echo "    DNS:    created"
  fi

  # 2. Pages custom domain
  body=$(jq -n --arg n "$fqdn" '{name:$n}')
  res=$(cf POST "/accounts/$ACCOUNT_ID/pages/projects/$project/domains" "$body")
  if echo "$res" | jq -e '.success' >/dev/null; then
    echo "    Pages:  attached"
  elif echo "$res" | jq -e '.errors[]? | select(.message | test("already|exists"; "i"))' >/dev/null 2>&1; then
    echo "    Pages:  already attached"
  else
    die "Pages domain attach failed: $(echo "$res" | jq -c .errors)"
  fi

  # 3. Access application (self-hosted)
  APP_ID=$(cf GET "/accounts/$ACCOUNT_ID/access/apps" \
    | jq -r --arg d "$fqdn" '.result[] | select(.domain == $d) | .id' | head -n1)
  if [ -n "$APP_ID" ]; then
    echo "    Access: app exists ($APP_ID)"
  else
    body=$(jq -n --arg n "$appname" --arg d "$fqdn" \
      '{name:$n,domain:$d,type:"self_hosted",session_duration:"720h",app_launcher_visible:false,auto_redirect_to_identity:false,allowed_idps:[]}')
    res=$(cf POST "/accounts/$ACCOUNT_ID/access/apps" "$body")
    echo "$res" | jq -e '.success' >/dev/null || die "Access app create failed: $(echo "$res" | jq -c .errors)"
    APP_ID=$(echo "$res" | jq -r '.result.id')
    echo "    Access: app created ($APP_ID)"
  fi

  # 4. Allow policy (include owner email)
  POL_ID=$(cf GET "/accounts/$ACCOUNT_ID/access/apps/$APP_ID/policies" \
    | jq -r '.result[] | select(.name == "Allow owner") | .id' | head -n1)
  if [ -n "$POL_ID" ]; then
    echo "    Policy: exists"
  else
    body=$(jq -n --arg e "$OWNER_EMAIL" \
      '{name:"Allow owner",decision:"allow",precedence:1,include:[{email:{email:$e}}]}')
    res=$(cf POST "/accounts/$ACCOUNT_ID/access/apps/$APP_ID/policies" "$body")
    echo "$res" | jq -e '.success' >/dev/null || die "Policy create failed: $(echo "$res" | jq -c .errors)"
    echo "    Policy: created"
  fi
done

echo ""
echo "====================================================="
echo "Done. Each URL below is now gated by Zero Trust."
for short in "${PROJECTS[@]}"; do
  echo "  https://comeback-$short.$DOMAIN"
done
echo ""
echo "First visit: Cloudflare asks for $OWNER_EMAIL, emails a 6-digit PIN, session lasts 30 days."
echo ""
echo "Follow-ups:"
echo "  - Add Alexander to the comeback-alexander app (Zero Trust dashboard > Access > Applications)"
echo "  - Revoke this token when done: https://dash.cloudflare.com/profile/api-tokens"
echo "  - Remove from Keychain if no longer needed:"
echo "      security delete-generic-password -a \"\$USER\" -s \"$KEYCHAIN_SERVICE\""
