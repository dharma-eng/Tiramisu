# Tiramisu

## Install

> yarn install

## Compile

**Typescript**

> yarn build:ts

Compiles `app/` using typescript and places the output in `dist/`.

**Solidity**

> yarn build:sol

Compiles `contracts/` using truffle and places the output in `build/`.

## Deploy

**Start**

> yarn start

Starts a local ganache node.

**Migrate**

> yarn migrate

If a local ganache instance is running, this will deploy the primary contracts using Truffle according to the migrations in `migrations/`.

## Test

**Mocha**

> yarn mocha:ts -- [args]

Runs mocha using typescript with whatever arguments are passed.

Example:

> yarn mocha:ts -- ./test/tests/Blockchain.spec.ts

**Coverage**

> yarn test:coverage

Generates test coverage for all tests.

### App Tests

**All**

> yarn test:app

Runs all the typescript tests in `test/tests/`.

**Coverage**

> yarn test:coverage:app

Uses nyc to generate test coverage for all the app tests.

**Blockchain**

> yarn test:blockchain

Tests the blockchain class.

**State**

> yarn test:state

Tests the state wrapper class.

**Transactions**

> yarn test:transactions

Tests transaction execution using the state machine class.

### Solidity Tests

**Coverage**

> yarn test:coverage:sol

Generates test coverage for solidity using Truffle.
