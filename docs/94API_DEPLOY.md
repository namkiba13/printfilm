# 94API Film

- Fork: `namkiba13/printfilm`, branch `deploy/94api`.
- Coolify builds `docker-compose.coolify.yml` from the repository.
- User app: `https://film.94api.dev`; administration: `https://film-admin.94api.dev`.
- `OPENAI_BASE_URL` selects the gateway at process startup. The legacy internal channel ID remains `tokenfree` for database compatibility; requests use the configured gateway.
- Initial deployment enables text through 94API. Image/video/audio model defaults are empty; configure real models and verify their protocol before enabling them.
- The original TokenFree image/video transformations apply only to TokenFree hosts. Custom gateway multimedia compatibility is not implied by model discovery.
- PostgreSQL, Redis and generated media have persistent volumes. Only the web frontends receive public domains. Media URLs retain upstream public-file semantics; do not upload confidential media.
- Registration and local wallet charging are disabled for the initial private-use deployment. Upstream 94API usage still consumes the dedicated API key budget.
- Secrets are entered as Coolify runtime variables, never in Git. Bootstrap with `python -m scripts.create_admin` in `api`, then remove `INITIAL_ADMIN_PASSWORD` and restart.
- Update by reviewing upstream changes, running backend tests and both frontend lint/build commands, pushing this branch and deploying its exact commit in Coolify.
- Roll back to the previous application commit while retaining all named volumes. Database migrations must be reviewed separately before later upgrades.
