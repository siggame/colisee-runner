# siggame/colisee-runner

The runner service is responsible for claiming and processing queued games.

[![Travis](https://img.shields.io/travis/siggame/colisee-runner.svg?style=flat-square)](https://travis-ci.org/siggame/colisee-runner)
[![Docker Pulls](https://img.shields.io/docker/pulls/siggame/colisee-runner.svg?style=flat-square)](https://hub.docker.com/r/siggame/colisee-runner/)
[![GitHub Tag](https://img.shields.io/github/tag/siggame/colisee-runner.svg?style=flat-square)](https://github.com/siggame/colisee-runner/tags)
[![dependencies Status](https://david-dm.org/siggame/colisee-runner/status.svg)](https://david-dm.org/siggame/colisee-runner)
[![devDependencies Status](https://david-dm.org/siggame/colisee-runner/dev-status.svg)](https://david-dm.org/siggame/colisee-runner?type=dev)

## Table Of Contents

- [Description](#description)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributors](#contributors)
- [Change Log](#change-log)
- [License](#license)
- [Contributing](#contributing)

## Description

The runner service is responsible for claiming and processing queued games. The workflow
for a runner is to claim a queued game, if the runner's queue of playing games is not full,
then play the game and add it to the queue of games being played. When a game is finished, the game
will be removed from the playing queue. During this process the runner will update the status
of a game and write the logs to storage for events like pulling the client image, running the client
image, and any errors that may occur.

## Getting Started

Using docker.

```bash
docker pull siggame/colisee-runner
```

Using npm.

```bash
npm run build
```

## Usage

### API

#### `GET /status`

Returns the list of games currently in the runner's queue.

### Environment Variables

A `.env` file is the preferred method for setting these variables. Simply add a new line for each variable override.

#### Runner Settings

- `OUTPUT_DIR`: output directory
- `PORT`: port number to host the `/status` endpoint
- `RETRY_ATTEMPTS`: attempts to be made to connect to services
- `RUNNER_QUEUE_LIMIT`: size limit on runner queue
- `TIMEOUT`: timeout between attempts

#### Client Settings

- `CLIENT_CPU_PERIOD`: defines the total demand available for the cpu
- `CLIENT_CPU_QUOTA`: amount of cpu "time" the container can use in a period
- `CLIENT_MEMORY_LIMIT`: client container memory limit
- `CLIENT_NETWORK`: isolated client network name
- `CLIENT_USER`: user used to execute container

#### Database Settings `*`

- `DB_HOST`: hostname for postgresql
- `DB_PORT`: port for postgresql
- `DB_USER`: user for postgresql
- `DB_PASSWORD`: password for postgresql
- `DB_DB`: db name for postgresql

#### Docker Host Settings

- `DOCKER_HOST`: hostname where docker is located
- `DOCKER_PORT`: port where docker is listening for connections

#### Docker Registry Settings

- `REGISTRY_HOST`: hostname of container registry
- `REGISTRY_PORT`: port of container registry

#### Game Server Settings

- `GAME_NAME`: name of the game being played
- `GAME_SERVER_API_PORT`: port for the game server api
- `GAME_SERVER_GAME_PORT`: port for the game communication
- `GAME_SERVER_HOST`: hostname of the game server

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

View our [LICENSE](https://github.com/siggame/colisee/blob/master/LICENSE)

## Contributing

View our [CONTRIBUTING.md](https://github.com/siggame/colisee/blob/master/CONTRIBUTING.md)
