# colisee-runner

## Requirements

Node v8.4.0
Docker 17.06 (optional)
docker-compose

## Configuring Runner

### Deployments

#### Docker Compose (Recommended)

Add a `.env` to the root of this project with the following contents:

```bash
GAME_NAME=<Saloon|Stumped|...>
GAME_SERVER_HOST=game_server
POSTGRES_HOST=db
PORT=8080
```

then execute the `docker-compose.yml` updater

```bash
$ # NOTE: this requires the utility envsubst
$ bash -c "./update-docker-compose.sh"
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

### Environment Variables

A `.env` file is the preferred method for setting these variables. Simply add a new line for each variable override.

#### Runner Settings

* `RUNNER_QUEUE_LIMIT`: size limit on runner queue
* `RETRY_ATTEMPTS`: attempts to be made to connect to services
* `TIMEOUT`: timeout between attempts
* `PORT`: port number to host the `/status` endpoint

#### Database Settings

* `POSTGRES_HOST`: hostname for postgresql
* `POSTGRES_PORT`: port for postgresql
* `POSTGRES_USER`: user for postgresql
* `POSTGRES_PASSWORD`: password for postgresql
* `POSTGRES_DB`: db name for postgresql

#### Docker Registry Settings

* `DOCKER_REGISTRY_HOST`: hostname of docker (private) registry
* `DOCKER_REGISTRY_PORT`: port of docker (private) registry

#### Game Server Settings

* `GAME_NAME`: name of the game being played
* `GAME_SERVER_HOST`: hostname of the game server
* `GAME_SERVER_GAME_PORT`: port for the game communication
* `GAME_SERVER_API_PORT`: port for the game server api

To see defaults for these values refer to `src/vars.ts`;