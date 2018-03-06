import { defaultTo, toNumber } from "lodash";
import { hostname } from "os";

export const RUNNER_QUEUE_LIMIT: number = defaultTo<number>(toNumber(process.env.RUNNER_QUEUE_LIMIT), 3);

export const DOCKER_HOST: string = defaultTo<string>(process.env.DOCKER_HOST, "");
export const DOCKER_PORT: number = defaultTo<number>(toNumber(process.env.DOCKER_PORT), 2375);

export const GAME_NAME: string = defaultTo<string>(process.env.GAME_NAME, "Chess");
export const GAME_SERVER_API_PORT: number = defaultTo<number>(toNumber(process.env.GAME_SERVER_API_PORT), 3080);
export const GAME_SERVER_GAME_PORT: number = defaultTo<number>(toNumber(process.env.GAME_SERVER_GAME_PORT), 3000);
export const GAME_SERVER_HOST: string = defaultTo<string>(process.env.GAME_SERVER_HOST, "localhost");

export const RETRY_ATTEMPTS: number = defaultTo<number>(toNumber(process.env.RETRY_ATTEMPTS), 5);
export const TIMEOUT: number = defaultTo<number>(toNumber(process.env.TIMEOUT), 5000);

export const CLIENT_CPU_PERIOD: number = defaultTo<number>(toNumber(process.env.CLIENT_CPU_PERIOD), 100000);
export const CLIENT_CPU_QUOTA: number = defaultTo<number>(toNumber(process.env.CLIENT_CPU_QUOTA), 25000);
export const CLIENT_MEMORY_LIMIT: number = defaultTo<number>(toNumber(process.env.CLIENT_MEMORY_LIMIT), 1000000000);
export const CLIENT_NETWORK: string = defaultTo<string>(process.env.CLIENT_NETWORK, "none");
export const CLIENT_USER: string = defaultTo<string>(process.env.CLIENT_USER, "nobody");

export const OUTPUT_DIR: string = defaultTo<string>(process.env.OUTPUT_DIR, `/app/output/${hostname()}`);
export const PORT: number = defaultTo<number>(toNumber(process.env.PORT), 8080);
