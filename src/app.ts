import * as dotenv from "dotenv";
dotenv.config();

import * as cors from "cors";
import * as express from "express";
import * as httpErrors from "http-errors";
import * as _ from "lodash";

import { delay, retryRequest } from "./helpers";
import { Runner } from "./runner";
import { GAME_NAME, GAME_SERVER_API_PORT, GAME_SERVER_GAME_PORT, GAME_SERVER_HOSTNAME, RETRY_ATTEMPTS, RUNNER_QUEUE_LIMIT, TIMEOUT } from "./vars";

// TODO: refactor to use websocket?

const app = express();

app.use(cors());

async function build_runner(): Promise<Runner> {
    // test docker sock and db connections

    await retryRequest({
        attempts: RETRY_ATTEMPTS,
        timeout: TIMEOUT,
        url: `http://${GAME_SERVER_HOSTNAME}:${GAME_SERVER_API_PORT}`,
    }).catch((error) => { console.log(error); process.exit(1); });

    return new Runner({
        docker_options: { },
        game_server_options: {
            api_port: GAME_SERVER_API_PORT,
            game_name: GAME_NAME,
            game_port: GAME_SERVER_GAME_PORT,
            hostname: GAME_SERVER_HOSTNAME,
        },
        queue_limit: RUNNER_QUEUE_LIMIT,
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
