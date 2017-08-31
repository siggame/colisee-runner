import "core-js/modules/es7.symbol.async-iterator";
import * as dotenv from "dotenv";
dotenv.config();

import * as cors from "cors";
import * as express from "express";
import * as httpErrors from "http-errors";
import * as _ from "lodash";
import * as request from "request";
import { Runner } from "./runner";
import { GAME_SERVER_API_PORT, GAME_SERVER_URL, RETRY_ATTEMPTS, TIMEOUT } from "./vars";

// TODO: refactor to use websocket?

const app = express();

app.use(cors());

interface IRetryOptions { url: string; attempts: number; timeout: number; }

function retryRequest(
    { url, attempts, timeout }: IRetryOptions,
    resolve: () => void,
    reject: (error?: Error) => void)
    : void {
    request.get(url, (error, response, body) => {
        // console.log(body);
        if (attempts === 0) {
            reject(new Error(`Max attempts reached for request to ${url}`));
        } else if (error || response.statusCode !== 200) {
            setTimeout(retryRequest, timeout, { url, attempts: attempts - 1, timeout }, resolve, reject);
        } else {
            resolve();
        }
    });
}

// TODO: refactor to be nicer

async function* build_runner() {
    await new Promise((res, rej) =>
        retryRequest({
            attempts: RETRY_ATTEMPTS,
            timeout: TIMEOUT,
            url: `${GAME_SERVER_URL}:${GAME_SERVER_API_PORT}`,
        }, res, rej),
    ).catch((error) => { console.error(error); process.exit(1); });

    const r = new Runner();

    yield r;

    for await (const $ of r.run()) {
        // this is p dope
    }
}

const step = build_runner();
const runner = step.next();

app.get("/status", async (req, res) => {
    const { value: { game } } = await runner;
    res.json(game);
    res.end();
});

app.listen(8080, () => {
    step.next();
    console.log("Listening on port 8080...");
});
