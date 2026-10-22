# Deploy on Liara (Docker)

## 1. Build the image

The image includes `data/torob.db` through Next.js standalone tracing. It is about 600 MB.

`data/torob.db` is generated locally by `python3 scripts/build_db.py` and is gitignored. If you deploy from this folder with the Liara CLI, it is in the build context. If you deploy from a Git repository, either commit the DB or add `torob-dataset/` to the build and run `build_db.py` in a builder stage; otherwise the image will start without data.

```bash
docker build -t hamqadam:local .
```

Test it locally:

```bash
docker run --rm -p 3012:3000 \
  -e DEEPSEEK_API_KEY="..." \
  -e DEEPSEEK_BASE_URL="https://api.deepseek.com" \
  -e DEEPSEEK_MODEL="deepseek-chat" \
  hamqadam:local
```

```bash
npm run smoke -- http://localhost:3012
```

## 2. Liara

Install the CLI and log in:

```bash
npm i -g @liara/cli
liara login
```

Set the app name in `liara.json` if needed, then:

```bash
liara deploy --platform docker --port 3000
```

Set these environment variables in the Liara app dashboard (or with `liara env:set`):

```
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DB_PATH=/app/data/torob.db
```

For a stable demo recording at daytime, add `DEMO_NOW=2026-10-21T18:00:00+03:30` (leave it unset for real time).

## 3. After deploy

```bash
curl https://<your-domain>/api/health
npm run smoke -- https://<your-domain>
```

Expected health response:

```json
{"ok":true,"shops":6476,"products":225903,"offers":331506,"llm":true}
```

Open the site on a phone. Check:

- 375px: no horizontal scroll.
- The demo query returns the S25 FE.
- `/store` lists the seeded shops.
- An owner reply updates `/ask/<runId>` within two seconds.
- The visit plan opens and the Google Maps link works.

## 4. Reset before recording

Open `/store` and press «بازنشانی», or:

```bash
curl -X POST https://<your-domain>/api/demo/reset
```

## Notes

- The container filesystem is writable; messages and confirmations live in the SQLite file. A restart may reset them. That is fine for the demo; use a volume if you need persistence.
- If the host mounts `/app/data` read-only, set `DB_PATH` to a writable copy and adjust the startup command. The current image writes in place.
- The image contains the dataset DB; do not commit `data/torob.db` or `.env.local` to git.
- DeepSeek is optional. Without `DEEPSEEK_API_KEY`, the deterministic parser still handles the demo, but the health response reports `llm:false`.
