import * as dotenv from "dotenv";
dotenv.config();

import * as cors from "cors";
import * as Docker from "dockerode";
import * as express from "express";
import * as _ from "lodash";
import * as request from "request-promise-native";
import * as winston from "winston";

import * as db from "./db";
import { delay, identity, retry } from "./helpers";
import { Runner } from "./runner";
import * as vars from "./vars";

const app = express();

app.use(cors());

winston.configure({
    transports: [
        new (winston.transports.Console)(),
    ],
});

async function build_runner(): Promise<Runner> {
    // verify docker is available
    const docker = new Docker();
    const containers = await docker.listContainers()
        .then(identity<Docker.ContainerInfo[]>())
        .catch((e) => { throw e; });

    const c_runner = containers.find(
        ({ Labels: { "com.docker.compose.service": name } }) => name === "runner",
    );
    let network_name = "default";
    if (c_runner) {
        network_name = c_runner.HostConfig.NetworkMode;
    }

    // verify db is available
    await retry(
        { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
        async () =>
            db.query("teams").select("id").limit(1).then(identity()),
    ).catch((e) => { throw e; });

    // verify game server is available
    await retry(
        { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
        () => request.get(`http://${vars.GAME_SERVER_HOST}:${vars.GAME_SERVER_API_PORT}`),
    ).catch((e) => { throw e; });

    let docker_options: Docker.DockerOptions = {};

    if (vars.DOCKER_REGISTRY_HOST !== "") {
        docker_options = {
            host: vars.DOCKER_REGISTRY_HOST,
            port: vars.DOCKER_REGISTRY_PORT,
            protocol: "http",
        };
    }

    return new Runner({
        docker_options,
        game_server_options: {
            api_port: vars.GAME_SERVER_API_PORT,
            game_name: vars.GAME_NAME,
            game_port: vars.GAME_SERVER_GAME_PORT,
            hostname: vars.GAME_SERVER_HOST,
            network_name,
        },
        queue_limit: vars.RUNNER_QUEUE_LIMIT,
    });
}

let runner: Runner;

app.get("/status", (req, res) => {
    res.json(runner.games);
    res.end();
});

export default () => {
    app.listen(vars.PORT, async () => {
        runner = await build_runner()
            .catch((e): any => {
                winston.error("Building Runner Failed\n", e);
                process.exit(1);
            });
        runner.run().catch((e) => { winston.error(e); });
        winston.info(`Listening on port ${vars.PORT}...`);
    });
};

export { app };
