# Qubetics Contract Verification Service

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-20.10.0-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

Backend service that verifies EVM smart contracts deployed on the Qubetics chain. It compiles submitted Solidity source with `solc`, compares the resulting bytecode against on-chain bytecode, and stores verified source, ABI and metadata for the explorer/indexer. Proxy contracts are detected and linked to their implementation.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Running the Service](#running-the-service)
- [Docker](#docker)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [License](#license)

---

## Architecture

```
            ┌──────────────┐  HTTP   ┌──────────────────────────┐
 Client ───▶│  Express API │────────▶│ PostgreSQL (Prisma ORM)  │
 / Explorer └──────┬───────┘         └──────────────────────────┘
                   │ enqueue                     ▲
                   ▼                             │ persist result
            ┌──────────────┐  consume ┌──────────┴───────────┐
            │   RabbitMQ   │─────────▶│ Verification Consumer │──▶ EVM RPC node
            └──────────────┘          │  (solc compile+match) │    (on-chain bytecode)
                                      └───────────────────────┘
                   Redis: caching / rate-limit support
```

1. A verification request (source files + compiler settings) is submitted to the API.
2. The request is queued on `CONTRACT_VERIFICATION_QUEUE` in RabbitMQ.
3. The consumer compiles the source with the requested `solc` version and matches bytecode against the chain via the EVM RPC endpoint.
4. On success, source code, ABI and verification details are persisted to PostgreSQL and exposed through the read APIs used by the indexer/explorer.

## Tech Stack

| Layer          | Technology                              |
| -------------- | --------------------------------------- |
| Runtime        | Node.js 20, TypeScript                  |
| Web framework  | Express, Helmet, CORS, express-rate-limit |
| Database / ORM | PostgreSQL, Prisma                      |
| Queue          | RabbitMQ (`amqplib`)                    |
| Cache          | Redis (`ioredis`)                       |
| Blockchain     | `solc`, `ethers`, `web3`                |
| Docs           | Swagger UI                              |
| Logging        | Winston, Morgan                         |

## Prerequisites

- Node.js `20.10.0` and npm `10.2.3`
- PostgreSQL 13+
- Redis 6+
- RabbitMQ 3.x
- Access to a Qubetics EVM JSON-RPC endpoint

## Getting Started

```bash
git clone https://github.com/Qubetics/qubetics-contract-verification.git
cd qubetics-contract-verification
npm install
cp .env.example .env        # then fill in the values below
npm run generate:prisma     # generate Prisma client
```

## Environment Variables

| Variable                   | Description                                      | Example                                   |
| -------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `NODE_ENV`                 | Runtime environment                              | `development`                             |
| `PORT`                     | HTTP port (defaults to `3146` if unset)          | `9000`                                    |
| `DATABASE_URL`             | PostgreSQL connection string                     | `postgresql://user:pass@localhost:5432/db`|
| `REDIS_HOST`               | Redis host                                       | `localhost`                               |
| `REDIS_PORT`               | Redis port                                       | `6379`                                    |
| `RABITMQ_URL`              | RabbitMQ connection URL                          | `amqp://guest:guest@localhost:5672`       |
| `EVM_TENDERMENT_HTTP_HOST` | Qubetics EVM JSON-RPC endpoint                   | `https://rpc.qubetics.example`            |
| `API_LOGS_ENABLE`          | Enable HTTP request logging (`1` / `0`)          | `1`                                       |
| `WINDOW_MS`                | Rate-limit window                                | `1`                                       |
| `MAX_REQUEST`              | Max requests per window                          | `5`                                       |
| `FILE_SIZE`                | Max upload file size (MB)                        | `2`                                       |
| `FILE_LIMIT`               | Max number of uploaded files per request         | `15`                                      |

> Never commit real credentials. Keep `.env` out of version control.

## Database

The Prisma schema lives in [`prisma/schema.prisma`](prisma/schema.prisma).

```bash
npm run generate:prisma   # generate client
npm run migrate:dev       # apply migrations (development)
npm run db:studio         # browse data in Prisma Studio
```

## Running the Service

| Command                     | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `npm start`                 | Run with nodemon (development)                 |
| `npm run start:local`       | Lint, then run with `NODE_ENV=local`           |
| `npm run build:prod`        | Compile TypeScript to `build/`                 |
| `npm run start:production`  | Run compiled build with `NODE_ENV=production`  |
| `npm run start:staging`     | Run compiled build with `NODE_ENV=staging`     |

Health check:

```bash
curl http://localhost:$PORT/status
# {"message":"Service is up and running."}
```

## Docker

```bash
docker build -t qubetics-contract-verification .
docker run --env-file .env -p 7900:7900 -e PORT=7900 qubetics-contract-verification
```

Kubernetes manifests for dev and testnet are available under [`.github/workflows`](.github/workflows).

## API Reference

Interactive Swagger documentation is served at **`/api/docs`** (source: [`swagger.json`](swagger.json)).

| Method | Path                                         | Description                                |
| ------ | -------------------------------------------- | ------------------------------------------ |
| GET    | `/status`                                    | Service health check                       |
| POST   | `/verify`                                    | Submit a contract for verification         |
| GET    | `/verify`                                    | Check contract verification                |
| GET    | `/detail/:contractAddress`                   | Verified contract details                  |
| GET    | `/contract/status/:contractAddress`          | Verification status of a contract          |
| GET    | `/abi/:contractAddress`                      | Contract ABI                               |
| GET    | `/verification/detail/:contractAddress`      | Verification metadata                      |
| GET    | `/user/verified/:walletAddress`              | Contracts verified by a wallet             |
| GET    | `/top`                                       | Top verified contracts                     |
| GET    | `/widget`                                    | Verification statistics widget             |
| GET    | `/type`                                      | Supported compiler types / versions        |
| GET    | `/license/type`                              | Supported license types                    |
| GET    | `/verifyproxycontract`                       | Verify a proxy contract                    |
| GET    | `/saveProxyContract`                         | Link proxy to implementation               |
| POST   | `/uploadIcon`                                | Verify signed message and upload token icon|

> In deployed environments these routes are typically exposed behind a gateway prefix (e.g. `/evm/contracts/...`), as reflected in Swagger.

## Project Structure

```
├── prisma/                 # Prisma schema
├── src/
│   ├── App.ts              # Express app, middleware, Swagger
│   ├── server.ts           # HTTP server bootstrap
│   ├── routes.ts           # Route registration
│   ├── environments/       # Environment loading
│   ├── module/
│   │   ├── contract/       # Verification API + RabbitMQ consumer
│   │   ├── compiler/       # Compiler & license metadata
│   │   ├── proxy/          # Proxy contract detection / linking
│   │   └── verify/         # Signed-message verification, icon upload
│   ├── service/            # DB, Redis, RabbitMQ clients
│   ├── helper/             # Web3, upload, rate-limit, utilities
│   ├── middlewares/        # Multer, source-code payload extraction
│   └── lib/logger.ts       # Winston logger
├── swagger.json            # OpenAPI spec
└── Dockerfile
```

## Development Workflow

```bash
npm run lint        # ESLint
npm run lint-fix    # Auto-fix lint issues
npm run pretty      # Prettier formatting
```

Husky git hooks run linting and formatting on commit/push.

## Contributing

1. Fork the repository and create a feature branch.
2. Keep changes linted and formatted.
3. Open a pull request with a clear description of the change.

## License

Released under the [MIT License](LICENSE). © 2026 Qubetics.
