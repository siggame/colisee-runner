# siggame/colisee-runner

A brief description of the project.

[![Travis](https://img.shields.io/travis/siggame/colisee-runner.svg?style=flat-square)](https://travis-ci.org/siggame/colisee-runner)
[![Docker Pulls](https://img.shields.io/docker/pulls/siggame/colisee-runner.svg?style=flat-square)](https://hub.docker.com/r/siggame/colisee-runner/)
[![GitHub Tag](https://img.shields.io/github/tag/siggame/colisee-runner.svg?style=flat-square)](https://github.com/siggame/colisee-runner/tags)
[![Dependencies](https://img.shields.io/david/siggame/colisee-runner.svg)](https://github.com/siggame/colisee-runner)
[![NPM Version](https://img.shields.io/npm/v/@siggame/colisee-runner.svg?style=flat-square)](https://www.npmjs.com/package/@siggame/colisee-runner)
[![NPM Total Downloads](https://img.shields.io/npm/dt/@siggame/colisee-runner.svg?style=flat-square)](https://www.npmjs.com/package/@siggame/colisee-runner)

## Table Of Contents

- [Description](#description)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributors](#contributors)
- [Change Log](#change-log)
- [License](#license)
- [Contributing](#contributing)

## Description

A long description of the project.

## Getting Started

Using docker.

```bash
docker pull siggame/colisee-runner
```

Using npm.

```bash
npm run setup && npm run start-prod
```

## Usage

### Configuring Runner

#### Deployments

##### Docker Compose (Recommended)

Add a `.env` to the root of this project with the following contents:

```bash
GAME_NAME=<Saloon|Stumped|...>
GAME_SERVER_HOST=game_server
POSTGRES_HOST=db
PORT=8080
```

then execute the `docker-compose.yml` updater

```bash
# NOTE: this requires the utility envsubst
$ ./update-docker-compose.sh
```

then simply run `docker-compose up --build`.

This deployment is recommended because it places the services
on the same network which allows them to refer to each other
by their service name (as the hostname). This is important as
the runner relies on docker to run clients and the clients
will have problems communicating to services running on the host
directly (for windows and macos users).

**NOTE**: The `PORT` number will be the port available in the container network.
To access the `/status` endpoint it will be necessary to determine the random port
exposed to the host that the runner has been assigned. This is useful so that
there aren't conflicts when scaling up runners.

#### Environment Variables

A `.env` file is the preferred method for setting these variables. Simply add a new line for each variable override.

##### Runner Settings

- `RUNNER_QUEUE_LIMIT`: size limit on runner queue
- `RETRY_ATTEMPTS`: attempts to be made to connect to services
- `TIMEOUT`: timeout between attempts
- `PORT`: port number to host the `/status` endpoint

##### Database Settings `*`

- `DB_HOST`: hostname for postgresql
- `DB_PORT`: port for postgresql
- `DB_USER`: user for postgresql
- `DB_PASSWORD`: password for postgresql
- `DB_DB`: db name for postgresql

##### Docker Registry Settings

- `DOCKER_REGISTRY_HOST`: hostname of docker (private) registry
- `DOCKER_REGISTRY_PORT`: port of docker (private) registry

##### Game Server Settings

- `GAME_NAME`: name of the game being played
- `GAME_SERVER_HOST`: hostname of the game server
- `GAME_SERVER_GAME_PORT`: port for the game communication
- `GAME_SERVER_API_PORT`: port for the game server api

To see defaults for these values refer to `src/vars.ts`;

`*` refer to [siggame/colisee-lib](https://github.com/siggame/colisee-lib)

## Contributors

- [Russley Shaw](https://github.com/russleyshaw)
- [user404d](https://github.com/user404d)
- [Hannah Reinbolt](https://github.com/LoneGalaxy)
- [Matthew Qualls](https://github.com/MatthewQualls)

## Change Log

View our [CHANGELOG.md](https://github.com/siggame/colisee-runner/blob/master/CHANGELOG.md)

## License

View our [LICENSE.md](https://github.com/siggame/colisee/blob/master/LICENSE.md)

## Contributing

View our [CONTRIBUTING.md](https://github.com/siggame/colisee/blob/master/CONTRIBUTING.md)
