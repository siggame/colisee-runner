import { defaultTo, toNumber } from "lodash";
import { hostname } from "os";

export const RUNNER_QUEUE_LIMIT: number = defaultTo<number>(toNumber(process.env.RUNNER_QUEUE_LIMIT), 3);

export const REGISTRY_HOST: string = defaultTo<string>(process.env.REGISTRY_HOST, "localhost");
export const REGISTRY_PORT: number = defaultTo<number>(toNumber(process.env.REGISTRY_PORT), 5000);

export const GAME_NAME: string = defaultTo<string>(process.env.GAME_NAME, "Chess");
export const GAME_SERVER_API_PORT: number = defaultTo<number>(toNumber(process.env.GAME_SERVER_API_PORT), 3080);
export const GAME_SERVER_GAME_PORT: number = defaultTo<number>(toNumber(process.env.GAME_SERVER_GAME_PORT), 3000);
export const GAME_SERVER_HOST: string = defaultTo<string>(process.env.GAME_SERVER_HOST, "localhost");
export const GAME_SERVER_NETWORK: string = defaultTo<string>(process.env.GAME_SERVER_NETWORK, "");

export const RETRY_ATTEMPTS: number = defaultTo<number>(toNumber(process.env.RETRY_ATTEMPTS), 5);
export const TIMEOUT: number = defaultTo<number>(toNumber(process.env.TIMEOUT), 5000);

export const OUTPUT_DIR: string = defaultTo<string>(process.env.OUTPUT_DIR, `/app/output/${hostname()}`);
export const PORT: number = defaultTo<number>(toNumber(process.env.PORT), 8080);
