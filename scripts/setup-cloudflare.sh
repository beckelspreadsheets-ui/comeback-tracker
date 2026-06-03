#!/usr/bin/env bash
# Wires up custom domains, Zero Trust Access, and the shared D1 sync database.
# Token is pulled from macOS Keychain; never embed tokens in this repo.
# Idempotent for DNS, domains, Access app creation, D1 creation, and migration.
set -euo pipefail

ACCOUNT_ID="${ACCOUNT_ID:-8e8aa1cbf30faaf422ef2491d832b0b7}"
DOMAIN="${DOMAIN:-evenpathhomes.com}"
PROJECTS=("andrew" "alexander")
DB_NAME="${DB_NAME:-comeback_sync}"
KEYCHAIN_SERVICE="${KEYCHAIN_SERVICE:-cf-token-comeback}"

API="https://api.cloudflare.com/client/v4"

have() { command -v "$1" >/dev/null 2>&1; }
for bin in security curl jq; do have "$bin" || { echo "missing: $bin"; exit 1; }; done

ACCESS_EMAILS_CSV="${ACCESS_EMAILS:-}"
if [ -z "$ACCESS_EMAILS_CSV" ]; then
  echo "Set ACCESS_EMAILS to a comma-separated allowlist before running."
  echo "Example:"
  echo "  ACCESS_EMAILS='andrew@example.com,alexander@example.com' scripts/setup-cloudflare.sh"
  exit 1
fi
ACCESS_POLICY_INCLUDE=$(jq -Rn --arg emails "$ACCESS_EMAILS_CSV" \
  '$emails | split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0)) | map({email:{email:.}})')
if [ "$(jq 'length' <<<"$ACCESS_POLICY_INCLUDE")" -eq 0 ]; then
  echo "ACCESS_EMAILS did not contain any email addresses."
  exit 1
fi

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

APP_AUD_LINES=""

echo "==> Verifying token"
cf GET /user/tokens/verify | jq -e '.success' >/dev/null || die "token invalid"
echo "    ok"

echo "==> Looking up zone: $DOMAIN"
ZONE_ID=$(cf GET "/zones?name=$DOMAIN" | jq -r '.result[0].id // empty')
[ -n "$ZONE_ID" ] || die "zone $DOMAIN not found"
echo "    zone=$ZONE_ID"

echo "==> Ensuring D1 database: $DB_NAME"
DB_ID=$(cf GET "/accounts/$ACCOUNT_ID/d1/database?name=$DB_NAME" \
  | jq -r --arg name "$DB_NAME" '.result[]? | select(.name == $name) | (.uuid // .id) // empty' \
  | head -n1)
if [ -n "$DB_ID" ]; then
  echo "    D1:     exists ($DB_ID)"
else
  body=$(jq -n --arg name "$DB_NAME" '{name:$name}')
  res=$(cf POST "/accounts/$ACCOUNT_ID/d1/database" "$body")
  echo "$res" | jq -e '.success' >/dev/null || die "D1 create failed: $(echo "$res" | jq -c .errors)"
  DB_ID=$(echo "$res" | jq -r '.result.uuid // .result.id')
  [ -n "$DB_ID" ] || die "D1 create succeeded but no database id was returned"
  echo "    D1:     created ($DB_ID)"
fi

echo "==> Applying D1 migration if needed"
table_check=$(jq -n '{sql:"SELECT name FROM sqlite_master WHERE type = '\''table'\'' AND name = '\''user_states'\'';"}')
res=$(cf POST "/accounts/$ACCOUNT_ID/d1/database/$DB_ID/query" "$table_check")
echo "$res" | jq -e '.success' >/dev/null || die "D1 table check failed: $(echo "$res" | jq -c .errors)"
has_table=$(echo "$res" | jq -r '.result[0].results[0].name // empty')
if [ "$has_table" = "user_states" ]; then
  echo "    D1:     migration already applied"
else
  migration_sql=$(<migrations/0001_comeback_sync.sql)
  body=$(jq -n --arg sql "$migration_sql" '{sql:$sql}')
  res=$(cf POST "/accounts/$ACCOUNT_ID/d1/database/$DB_ID/query" "$body")
  echo "$res" | jq -e '.success and ([.result[]?.success] | all)' >/dev/null \
    || die "D1 migration failed: $(echo "$res" | jq -c '.errors // .result')"
  echo "    D1:     migration applied"
fi

for short in "${PROJECTS[@]}"; do
  project="comeback-$short"
  fqdn="$project.$DOMAIN"
  pretty="$(tr '[:lower:]' '[:upper:]' <<<"${short:0:1}")${short:1}"
  appname="Comeback Tracker - $pretty"

  echo ""
  echo "==> [$project] $fqdn"

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

  body=$(jq -n --arg n "$fqdn" '{name:$n}')
  res=$(cf POST "/accounts/$ACCOUNT_ID/pages/projects/$project/domains" "$body")
  if echo "$res" | jq -e '.success' >/dev/null; then
    echo "    Pages:  domain attached"
  elif echo "$res" | jq -e '.errors[]? | select(.message | test("already|exists"; "i"))' >/dev/null 2>&1; then
    echo "    Pages:  domain already attached"
  else
    die "Pages domain attach failed: $(echo "$res" | jq -c .errors)"
  fi

  body=$(jq -n --arg id "$DB_ID" \
    '{deployment_configs:{production:{d1_databases:{DB:{id:$id}}},preview:{d1_databases:{DB:{id:$id}}}}}')
  res=$(cf PATCH "/accounts/$ACCOUNT_ID/pages/projects/$project" "$body")
  echo "$res" | jq -e '.success' >/dev/null || die "Pages D1 binding failed: $(echo "$res" | jq -c .errors)"
  echo "    D1:     bound as DB"

  APP_ID=$(cf GET "/accounts/$ACCOUNT_ID/access/apps" \
    | jq -r --arg d "$fqdn" '.result[] | select(.domain == $d) | .id' | head -n1)
  if [ -n "$APP_ID" ]; then
    app_res=$(cf GET "/accounts/$ACCOUNT_ID/access/apps/$APP_ID")
    echo "    Access: app exists ($APP_ID)"
  else
    body=$(jq -n --arg n "$appname" --arg d "$fqdn" \
      '{name:$n,domain:$d,type:"self_hosted",session_duration:"720h",app_launcher_visible:false,auto_redirect_to_identity:false,allowed_idps:[]}')
    app_res=$(cf POST "/accounts/$ACCOUNT_ID/access/apps" "$body")
    echo "$app_res" | jq -e '.success' >/dev/null || die "Access app create failed: $(echo "$app_res" | jq -c .errors)"
    APP_ID=$(echo "$app_res" | jq -r '.result.id')
    echo "    Access: app created ($APP_ID)"
  fi
  app_aud=$(echo "$app_res" | jq -r '.result.aud // empty')
  APP_AUD_LINES="${APP_AUD_LINES}  $project:
    CF_ACCESS_AUD=${app_aud:-<copy from Access application>}
    CF_ACCESS_TEAM_DOMAIN=https://<your-team-name>.cloudflareaccess.com
    SYNC_USERS_JSON=<email-to-user mapping JSON>
"

  POL_ID=$(cf GET "/accounts/$ACCOUNT_ID/access/apps/$APP_ID/policies" \
    | jq -r '.result[] | select(.name == "Allow comeback users") | .id' | head -n1)
  if [ -n "$POL_ID" ]; then
    echo "    Policy: exists"
  else
    body=$(jq -n --argjson include "$ACCESS_POLICY_INCLUDE" \
      '{name:"Allow comeback users",decision:"allow",precedence:1,include:$include}')
    res=$(cf POST "/accounts/$ACCOUNT_ID/access/apps/$APP_ID/policies" "$body")
    echo "$res" | jq -e '.success' >/dev/null || die "Policy create failed: $(echo "$res" | jq -c .errors)"
    echo "    Policy: created"
  fi
done

echo ""
echo "====================================================="
echo "Done. Each URL below is configured for Access and D1 sync."
for short in "${PROJECTS[@]}"; do
  project="comeback-$short"
  echo "  https://$project.$DOMAIN"
done
echo ""
echo "Set these Pages environment variables for each project:"
printf "%s" "$APP_AUD_LINES"
echo ""
echo "Then redeploy both Pages projects so the DB binding and env vars take effect."
