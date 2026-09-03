#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
readonly BUILD_DIR="$REPO_DIR/build"
readonly EXPECTED_DOCUMENT_ROOT="$HOME/public_html/kijo.amiosh.com"
readonly DOCUMENT_ROOT="${FRONTEND_DOCROOT:-$EXPECTED_DOCUMENT_ROOT}"
readonly MAINTENANCE_PAGE="$SCRIPT_DIR/frontend-maintenance.html"
readonly MAINTENANCE_RULES="$SCRIPT_DIR/frontend-maintenance.htaccess"
readonly MODE="${1:-deploy}"

maintenance_enabled=false

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

validate_document_root() {
  [[ "$DOCUMENT_ROOT" == "$EXPECTED_DOCUMENT_ROOT" ]] ||
    fail "FRONTEND_DOCROOT must be exactly $EXPECTED_DOCUMENT_ROOT"
  [[ -d "$DOCUMENT_ROOT" ]] || fail "document root does not exist: $DOCUMENT_ROOT"
}

validate_maintenance_assets() {
  [[ -f "$MAINTENANCE_PAGE" ]] || fail "missing maintenance page: $MAINTENANCE_PAGE"
  [[ -f "$MAINTENANCE_RULES" ]] || fail "missing maintenance rules: $MAINTENANCE_RULES"
}

validate_build() {
  [[ -f "$BUILD_DIR/index.html" ]] || fail "missing frontend build: $BUILD_DIR/index.html"
  [[ -f "$BUILD_DIR/.htaccess" ]] || fail "missing production rules: $BUILD_DIR/.htaccess"
}

enable_maintenance() {
  local page_tmp="$DOCUMENT_ROOT/.maintenance.html.tmp"
  local rules_tmp="$DOCUMENT_ROOT/.maintenance.htaccess.tmp"

  cp -- "$MAINTENANCE_PAGE" "$page_tmp"
  mv -f -- "$page_tmp" "$DOCUMENT_ROOT/maintenance.html"
  cp -- "$MAINTENANCE_RULES" "$rules_tmp"
  mv -f -- "$rules_tmp" "$DOCUMENT_ROOT/.htaccess"
  maintenance_enabled=true
  printf 'Maintenance mode enabled at https://kijo.amiosh.com\n'
}

disable_maintenance() {
  local rules_tmp="$DOCUMENT_ROOT/.production.htaccess.tmp"

  [[ -f "$DOCUMENT_ROOT/index.html" ]] ||
    fail "refusing to disable maintenance without a live index: $DOCUMENT_ROOT/index.html"
  cp -- "$BUILD_DIR/.htaccess" "$rules_tmp"
  mv -f -- "$rules_tmp" "$DOCUMENT_ROOT/.htaccess"
  maintenance_enabled=false
  rm -f -- "$DOCUMENT_ROOT/maintenance.html"
  printf 'Maintenance mode disabled at https://kijo.amiosh.com\n'
}

replace_live_files() {
  local live_path
  local build_path

  shopt -s nullglob

  for live_path in "$DOCUMENT_ROOT"/*; do
    [[ "$(basename -- "$live_path")" == 'maintenance.html' ]] && continue
    rm -rf -- "$live_path"
  done

  for build_path in "$BUILD_DIR"/*; do
    cp -a -- "$build_path" "$DOCUMENT_ROOT/"
  done

  printf 'Frontend build copied to %s\n' "$DOCUMENT_ROOT"
}

report_failure() {
  local exit_code=$?

  if [[ "$maintenance_enabled" == true ]]; then
    printf 'Deployment stopped; maintenance mode remains enabled. Fix the error, then rerun the deployment.\n' >&2
  fi

  exit "$exit_code"
}

trap report_failure ERR

validate_document_root

case "$MODE" in
  deploy)
    validate_maintenance_assets
    validate_build
    enable_maintenance
    replace_live_files
    disable_maintenance
    ;;
  maintenance-on)
    validate_maintenance_assets
    enable_maintenance
    ;;
  maintenance-off)
    validate_build
    maintenance_enabled=true
    disable_maintenance
    ;;
  *)
    fail 'usage: bash scripts/deploy-frontend.sh [deploy|maintenance-on|maintenance-off]'
    ;;
esac
