# Joystick tokens and presales

This project implements Joystick token and its presale mechanism using Presale contract.

Tests are possible only on mainnet due to the link that presale uses to UniSwap environment.
In order to prepare testing environment please do the following:

Copy environment template to `.env`

```shell
cp .env.template .env
```

Edit `.env` file a setting ALCHEMY mainnet link and private key used to generate all the accounts

Start local node using

```shell
yarn fork
```

In separate window prepare testing environment by feeding preset list of accounts

```shell
yarn setup
```

Finally - you can run all tests

```shell
yarn mainnetTests
```

...or just presale contract tests

```shell
yarn mainnetPresaleTests
```
