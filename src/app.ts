import * as dotenv from "dotenv";
dotenv.config();

import * as cors from "cors";
import * as express from "express";
import * as httpErrors from "http-errors";
import * as _ from "lodash";

import { delay, retryRequest } from "./helpers";
import { Runner } from "./runner";
import * as vars from "./vars";

const app = express();

app.use(cors());

async function build_runner(): Promise<Runner> {
    // test docker sock and db connections

    await retryRequest({
        attempts: vars.RETRY_ATTEMPTS,
        timeout: vars.TIMEOUT,
        url: `http://${vars.GAME_SERVER_HOSTNAME}:${vars.GAME_SERVER_API_PORT}`,
    }).catch((error) => { console.log(error); process.exit(1); });

    return new Runner({
        docker_options: {
            host: vars.DOCKER_REGISTRY_HOST,
            port: vars.DOCKER_REGISTRY_PORT,
         },
        game_server_options: {
            api_port: vars.GAME_SERVER_API_PORT,
            game_name: vars.GAME_NAME,
            game_port: vars.GAME_SERVER_GAME_PORT,
            hostname: vars.GAME_SERVER_HOSTNAME,
        },
        queue_limit: vars.RUNNER_QUEUE_LIMIT,
    });
}

let runner: Runner;

app.get("/status", (req, res) => {
    res.json(runner.games);
    res.end();
});

app.listen(8080, async () => {
    runner = await build_runner();
    runner.run().catch(console.error);
    console.log("Listening on port 8080...");
});
