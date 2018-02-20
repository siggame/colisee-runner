import * as dotenv from "dotenv";
dotenv.config();

import * as cors from "cors";
import * as Docker from "dockerode";
import * as express from "express";
import { ErrorRequestHandler, RequestHandler } from "express";
import * as fs from "fs";
import { HttpError } from "http-errors";
import * as winston from "winston";

import * as db from "./db";
import { Network } from "./Docker";
import { identity, isPortReachable, retry } from "./helpers";
import { Runner } from "./runner";
import * as vars from "./vars";

winston.configure({
    transports: [
        new (winston.transports.Console)({
            timestamp: true,
        }),
    ],
});

// Logger Middleware
const logger: RequestHandler = (req, res, next) => {
    winston.info(`${req.method}\t${req.url}`);
    next();
};

// Error Middleware
const errorHandler: ErrorRequestHandler = (err: HttpError, req, res, next) => {
    winston.error(err.message);
    if (err.stack) { winston.error(err.stack); }
    res.status(err.status).end(err.message);
};

const app = express();

app.use(cors());
app.use(errorHandler);
app.use(logger);

async function build_runner(): Promise<Runner> {
    // verify docker is available
    const docker = new Docker();
    const networks: Network[] = await docker.listNetworks();
    const game_network_names: string[] = networks.filter((network) =>
        network.Name.indexOf(vars.GAME_SERVER_NETWORK) >= 0,
    ).map(({ Name }) => Name);
    const network_name = game_network_names.length === 0 ? "default" : game_network_names[0];

    // verify db is available
    await retry(
        { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
        async () => db.pingDatabase(),
    ).catch((e) => { winston.error("Database not available"); throw e; });

    // verify game server is available
    const game_server_url = `http://${vars.GAME_SERVER_HOST}:${vars.GAME_SERVER_API_PORT}`;
    await retry(
        { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
        () => isPortReachable(vars.GAME_SERVER_HOST, vars.GAME_SERVER_API_PORT, 500),
    ).catch((e) => { winston.error(`Game server not available at ${game_server_url}`); throw e; });

    let docker_options: Docker.DockerOptions = {};

    if (vars.REGISTRY_HOST !== "localhost") {
        docker_options = {
            host: vars.REGISTRY_HOST,
            port: vars.REGISTRY_PORT,
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
    if (!fs.existsSync(vars.OUTPUT_DIR)) {
        fs.mkdirSync(vars.OUTPUT_DIR);
    }
    app.listen(vars.PORT, async () => {
        runner = await build_runner()
            .catch((e): any => {
                winston.error("Building runner failed\n", e);
                process.exit(1);
            });
        runner.run().catch((e) => { winston.error(e); });
        winston.info(`Listening on port ${vars.PORT}...`);
    });
};

export { app };
