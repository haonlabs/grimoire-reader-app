# Grimoire browser gateway

This optional companion runs persistent Chromium for sources that require a real browser session. It is restricted to the configured CrotPedia and DoujinDesu HTTPS hosts and requires a bearer token; it is not a general-purpose proxy.

## VPS setup

1. Install Docker and Docker Compose on the VPS.
2. Copy `.env.example` to `.env` and generate a long random `GATEWAY_TOKEN`.
3. Run `docker compose up -d --build` in this directory.
4. Put an HTTPS reverse proxy in front of `127.0.0.1:8787`. Do not expose the container port directly.
5. Set these server-side environment variables on the Grimoire deployment:

   ```text
   GRIMOIRE_BROWSER_GATEWAY_URL=https://your-gateway.example.com
   GRIMOIRE_BROWSER_GATEWAY_TOKEN=the-same-long-random-token
   ```

The Chromium profile is retained in the `chromium-data` volume. If CrotPedia requires an interactive login or challenge that cannot complete headlessly, initialize that same profile in a secured administrator-only desktop/VNC session on the VPS, then restart this service in headless mode. Ordinary Grimoire users never receive or manage the profile cookies.

## Checks

The unauthenticated health endpoint is safe to use from a load balancer:

```sh
curl https://your-gateway.example.com/health
```

Test an authenticated fetch from the VPS or another trusted machine:

```sh
curl -X POST https://your-gateway.example.com/v1/fetch \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"url":"https://crotpedia.net/"}'
```

Use this only where you have permission to automate access to the source.

## Local OrbStack with real Chrome

### One-click launcher on macOS

After creating `browser-gateway/.env`, double-click `Start CrotPedia.command` in the project folder. It starts OrbStack or Docker Desktop when needed, opens a dedicated Brave/Chrome profile with the local bridge extension, rebuilds the gateway, and verifies CrotPedia automatically. The same browser profile is reused, so login and verification normally only need to be completed once. This launcher does not expose a Chrome remote-debugging port.

If CrotPedia presents a new interactive verification challenge, the launcher opens the site in the dedicated browser and asks you to run the launcher once more after verification.

The launcher writes a temporary, git-ignored extension configuration containing the local gateway token. Keep the project folder private and do not copy `browser-extension/runtime-config.js` into a distributable extension package.
