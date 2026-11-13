# TailsTalk 2 Web Client

The web client for TailsTalk 2, built with [Solid.js](https://www.solidjs.com/). It is a fork of the Stoat web client (for-web). The client is served at `https://tails1154.com` and talks to the TailsTalk 2 backend at `https://tails1154.com:9961/api`.

## Development

Install [mise](https://mise.jdx.dev/getting-started.html) and [pnpm](https://pnpm.io/), then:

```bash
# clone with submodules
git clone --recursive <this repository> client
cd client

# install packages and build the shared libraries
mise install:frozen
mise build/deps

# optional: point the client at a different backend
cp packages/client/.env.example packages/client/.env

# run the dev server
mise dev
```

The client reads its API address from `VITE_DEV_API_URL` in development and `VITE_API_URL` in production. If neither is set, it uses `https://tails1154.com:9961/api`.

### Tasks

| Task | What it does |
| --- | --- |
| `mise dev` | Start the Vite dev server |
| `mise start` | Serve the built app |
| `mise build` | Build the client |
| `mise build/prod` | Build for production |
| `mise test` | Run the tests |
| `mise lint` | Lint the code |
| `mise format` | Format the code |
| `lingui/extract` | Pull new user-visible strings into the message catalogs |
| `lingui/compile` | Compile the catalogs |

Run `mise lint` and `mise test` before committing.

## Conventions

- Every user-visible string must use Lingui (`t` or `<Trans>`). After adding strings, run the `lingui/extract` task and update the catalogs under `packages/client/components/i18n/catalogs/`.
- Every change to the client bumps the version in **both** `packages/client/public/tailstalk2.version` and `packages/client/src/version.ts` (`CURRENT_VERSION`).
- Do not commit build output (`dist/`), timestamp bundles, or local `.env` files.

## Deployment

Deploy with `./deploy.sh`. It extracts and compiles the translation catalogs, builds the client, and uploads it. Do not run the build steps by hand.

Output goes to `packages/client/dist`.

## Licence

The client is licensed under the GNU Affero General Public License v3.0 or later, the same as upstream Stoat.
