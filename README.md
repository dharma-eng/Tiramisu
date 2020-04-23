# Dharma L2

## Install

> npm install

## Compile

**Typescript**

> npm run build:ts

Compiles `app/` using typescript and places the output in `dist/`.

**Solidity**

> npm run build:sol

Compiles `contracts/` using truffle and places the output in `build/`.

## Deploy

**Start**

> npm run start

Starts a local ganache node.

**Migrate**

> npm run migrate

If a local ganache instance is running, this will deploy the primary contracts using Truffle according to the migrations in `migrations/`.

## Test

**Mocha**

> npm run mocha:ts -- [args]

Runs mocha using typescript with whatever arguments are passed.

Example:

> npm run mocha:ts -- ./test/tests/Blockchain.spec.ts

**Coverage**

> npm run test:coverage

Generates test coverage for all tests.

### App Tests

**All**

> npm run test:app

Runs all the typescript tests in `test/tests/`.

**Coverage**

> npm run test:coverage:app

Uses nyc to generate test coverage for all the app tests.

**Blockchain**

> npm run test:blockchain

Tests the blockchain class.

**State**

> npm run test:state

Tests the state wrapper class.

**Transactions**

> npm run test:transactions

Tests transaction execution using the state machine class.

### Solidity Tests

**Coverage**

> npm run test:coverage:sol

Generates test coverage for solidity using Truffle.
