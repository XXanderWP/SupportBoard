### KNOWLEDGE BASE
- This project is a Telegram-based support system.
- Users send messages to a Telegram group, which creates support topics.
- Support agents (admins) respond to these topics in the Telegram group.
- Support AI for generating answers.

Additional information:

- Entry point: the backend bootstrap is at [src/backend/index.ts](src/backend/index.ts#L1) (imports `./modules/index`).
- Backend modules: core logic lives in [src/backend/modules/](src/backend/modules/) (handlers for Telegram, storage, env, AI, etc.).
- Frontend: localization files are in [src/frontend/lang/](src/frontend/lang/) (en.json, ru.json, uk.json, shared.json).
- Shared code and types: see [src/shared/](src/shared/) and [src/types/](src/types/) for shared utilities and TypeScript definitions.
- Build & deployment: project includes `Dockerfile` and `docker-compose.yml` for containerized deployment; a built backend bundle is present in `bundle/backend/index.js`.
- Testing: unit tests are located alongside modules (files named `*.test.ts`) and Jest is configured (`jest.config.cjs`).
- Tech stack: Node.js + TypeScript, Webpack bundling, Jest for tests, Docker for deployment, and Telegram Bot API for messaging.
- Notes: look into `src/backend/modules/storage.ts` and `src/backend/modules/telegram.ts` for storage and Telegram integration details.