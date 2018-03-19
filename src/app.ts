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
import { isPortReachable, retry } from "./helpers";
import { Runner } from "./Runner";
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
    const docker_options: Docker.DockerOptions = vars.DOCKER_HOST !== "" && vars.DOCKER_PORT > 443 ? {
        host: vars.DOCKER_HOST,
        port: vars.DOCKER_PORT,
    } : { socketPath: "/var/run/docker.sock" };

    const docker = new Docker(docker_options);
    const game_server_url = `http://${vars.GAME_SERVER_HOST}:${vars.GAME_SERVER_API_PORT}`;
    await Promise.all([
        // verify docker is available
        retry(
            { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
            () => docker.info(),
        ).catch((error) => { winston.error("Docker not available"); throw error; }),

        // verify db is available
        retry(
            { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
            () => db.pingDatabase(),
        ).catch((error) => { winston.error("Database not available"); throw error; }),

        // verify game server is available
        retry(
            { attempts: vars.RETRY_ATTEMPTS, timeout: vars.TIMEOUT },
            () => isPortReachable(vars.GAME_SERVER_HOST, vars.GAME_SERVER_API_PORT, 500),
        ).catch((error) => { winston.error(`Game server not available at ${game_server_url}`); throw error; }),
    ]);

    return new Runner({
        docker_options,
        game_server_options: {
            api_port: vars.GAME_SERVER_API_PORT,
            game_name: vars.GAME_NAME,
            game_port: vars.GAME_SERVER_GAME_PORT,
            hostname: vars.GAME_SERVER_HOST,
        },
        queue_limit: vars.RUNNER_QUEUE_LIMIT,
    });
}

let runner: Runner;

app.get("/start", (req, res) => {
    winston.info("starting runner");
    runner.start();
    res.end();
});

app.get("/stop", async (req, res) => {
    winston.info("stopping runner");
    await runner.stop();
    res.end();
});

export default () => {
    if (!fs.existsSync(vars.OUTPUT_DIR)) {
        fs.mkdirSync(vars.OUTPUT_DIR);
    }
    app.listen(vars.PORT, async () => {
        try {
            runner = await build_runner();
        } catch (error) {
            winston.error("runner dependecies not met\n", error);
            process.exit(1);
        }
        winston.info(`Listening on port ${vars.PORT}...`);
        runner.start();
    });
};

export { app };
