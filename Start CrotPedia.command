#!/bin/zsh

set -u

grimoire_root="${0:A:h}"
gateway_dir="$grimoire_root/browser-gateway"
gateway_env="$gateway_dir/.env"
browser_profile="$gateway_dir/.chrome-profile"
extension_dir="$grimoire_root/browser-extension"
extension_config="$extension_dir/runtime-config.js"
gateway_result=""

cleanup() {
  if [[ -n "$gateway_result" && -f "$gateway_result" ]]; then
    rm -f "$gateway_result"
  fi
}
trap cleanup EXIT

pause_with_message() {
  print ""
  print "$1"
  print ""
  read -r "?Tekan Enter untuk menutup..."
  exit 1
}

wait_for_url() {
  local target_url="$1"
  local attempts="$2"
  local index=1
  while (( index <= attempts )); do
    if curl -fsS --max-time 2 "$target_url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    (( index += 1 ))
  done
  return 1
}

clear
print "Menyiapkan CrotPedia untuk Grimoire..."
print ""

[[ -d "$gateway_dir" ]] || pause_with_message "Folder browser gateway tidak ditemukan."
[[ -f "$gateway_env" ]] || pause_with_message "Konfigurasi browser-gateway/.env belum tersedia."
command -v docker >/dev/null 2>&1 || pause_with_message "Docker belum terpasang. Instal OrbStack atau Docker Desktop terlebih dahulu."
command -v curl >/dev/null 2>&1 || pause_with_message "curl tidak tersedia di Mac ini."
command -v node >/dev/null 2>&1 || pause_with_message "Node.js tidak tersedia di Mac ini."

if ! docker info >/dev/null 2>&1; then
  print "Menyalakan mesin container..."
  if open -Ra "OrbStack" >/dev/null 2>&1; then
    open -a "OrbStack"
  elif open -Ra "Docker" >/dev/null 2>&1; then
    open -a "Docker"
  else
    pause_with_message "OrbStack atau Docker Desktop tidak ditemukan."
  fi

  docker_ready=false
  for _ in {1..45}; do
    if docker info >/dev/null 2>&1; then
      docker_ready=true
      break
    fi
    sleep 1
  done
  [[ "$docker_ready" == true ]] || pause_with_message "Mesin container belum siap. Coba buka OrbStack/Docker lalu jalankan launcher ini lagi."
fi

browser_name=""
for candidate in "Brave Browser" "Google Chrome"; do
  if open -Ra "$candidate" >/dev/null 2>&1; then
    browser_name="$candidate"
    break
  fi
done
[[ -n "$browser_name" ]] || pause_with_message "Brave Browser atau Google Chrome tidak ditemukan."

grimoire_gateway_token="$(awk -F= '/^GATEWAY_TOKEN=/{print substr($0, index($0, "=") + 1)}' "$gateway_env" | tail -n 1)"
[[ ${#grimoire_gateway_token} -ge 32 ]] || pause_with_message "Token gateway belum dikonfigurasi dengan benar."

mkdir -p "$browser_profile"
LAUNCHER_GATEWAY_TOKEN="$grimoire_gateway_token" node -e '
  const fs = require("fs");
  const output = process.argv[1];
  fs.writeFileSync(output, `export const gatewayToken = ${JSON.stringify(process.env.LAUNCHER_GATEWAY_TOKEN || "")};\n`, { mode: 0o600 });
' "$extension_config"

print "Menyalakan browser gateway..."
if ! (cd "$gateway_dir" && BROWSER_TRANSPORT=extension CDP_URL= docker compose up -d); then
  pause_with_message "Browser gateway gagal dinyalakan."
fi

wait_for_url "http://127.0.0.1:8787/health" 30 || \
  pause_with_message "Browser gateway belum merespons."

extension_connected() {
  curl -fsS --max-time 2 "http://127.0.0.1:8787/health" 2>/dev/null | \
    node -e 'let data=""; process.stdin.on("data", chunk => data += chunk); process.stdin.on("end", () => { try { process.exit(JSON.parse(data).extensionConnected ? 0 : 1); } catch { process.exit(1); } });'
}

helper_browser_running() {
  pgrep -f -- "--user-data-dir=$browser_profile" >/dev/null 2>&1
}

if ! extension_connected; then
  for _ in {1..5}; do
    sleep 1
    extension_connected && break
  done
fi

if ! extension_connected; then
  if helper_browser_running; then
    print "Browser helper sudah berjalan. Menunggu extension tersambung..."
  else
    print "Membuka satu browser helper CrotPedia..."
    open -na "$browser_name" --args \
      --no-first-run \
      --no-default-browser-check \
      --user-data-dir="$browser_profile" \
      --disable-extensions-except="$extension_dir" \
      --load-extension="$extension_dir" \
      "https://crotpedia.net/"
  fi

  bridge_ready=false
  for _ in {1..30}; do
    if extension_connected; then
      bridge_ready=true
      break
    fi
    sleep 1
  done
  [[ "$bridge_ready" == true ]] || pause_with_message "Bridge browser belum tersambung. Tutup browser khusus tersebut lalu coba lagi."
fi

print "Menguji koneksi CrotPedia..."
gateway_result="$(mktemp -t grimoire-crotpedia.XXXXXX)"
gateway_status="$(curl -sS --max-time 75 \
  -o "$gateway_result" \
  -w '%{http_code}' \
  -X POST "http://127.0.0.1:8787/v1/fetch" \
  -H "Authorization: Bearer $grimoire_gateway_token" \
  -H "Content-Type: application/json" \
  --data '{"url":"https://crotpedia.net/"}')"

gateway_summary="$(node -e '
  const fs = require("fs");
  const file = process.argv[1];
  try {
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    const html = typeof payload.html === "string" ? payload.html : "";
    const count = (html.match(/\/baca\/series\//g) || []).length;
    const title = html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() || "CrotPedia";
    const challenged = /Just a moment|challenge-platform|cf_clearance|Melakukan verifikasi keamanan/i.test(html);
    const loginRequired = /Login terlebih dahulu|Log in|Masuk terlebih dahulu|type=["'\'' ]password/i.test(html);
    if (count > 0) process.stdout.write(`READY|${count}|${title}`);
    else if (challenged) process.stdout.write("ERROR|CrotPedia meminta verifikasi browser");
    else if (loginRequired) process.stdout.write("ERROR|Sesi login CrotPedia belum aktif");
    else process.stdout.write(`ERROR|${payload.error || "Halaman CrotPedia belum siap"}`);
  } catch {
    process.stdout.write("ERROR|Respons gateway tidak dapat dibaca");
  }
' "$gateway_result")"

if [[ "$gateway_status" == "200" && "$gateway_summary" == READY\|* ]]; then
  series_count="${${gateway_summary#READY|}%%|*}"
  curl -fsS --max-time 8 \
    -X POST "http://127.0.0.1:8787/v1/extension/close" \
    -H "Authorization: Bearer $grimoire_gateway_token" \
    -H "Content-Type: application/json" \
    --data '{"url":"https://crotpedia.net/"}' >/dev/null 2>&1 || true
  print ""
  print "CrotPedia siap dipakai di Grimoire (${series_count} tautan seri terdeteksi)."
  osascript -e 'display notification "CrotPedia sudah siap dipakai" with title "Grimoire Reader"' >/dev/null 2>&1 || true
  sleep 2
  exit 0
fi

gateway_error="${gateway_summary#ERROR|}"
print ""
print "CrotPedia masih meminta bantuan browser: $gateway_error"
curl -fsS --max-time 8 \
  -X POST "http://127.0.0.1:8787/v1/extension/open" \
  -H "Authorization: Bearer $grimoire_gateway_token" \
  -H "Content-Type: application/json" \
  --data '{"url":"https://crotpedia.net/"}' >/dev/null 2>&1 || true
open -a "$browser_name" >/dev/null 2>&1 || true
print "Selesaikan login atau verifikasi pada jendela yang terbuka, lalu klik launcher ini sekali lagi."
print ""
read -r "?Tekan Enter untuk menutup..."
