import { defaultTo, toNumber } from "lodash";

export const POSTGRES_HOST: string = defaultTo<string>(process.env.POSTGRES_HOST, "localhost");
export const POSTGRES_PORT: number = defaultTo<number>(toNumber(process.env.POSTGRES_PORT), 5432);
export const POSTGRES_USER: string = defaultTo<string>(process.env.POSTGRES_USER, "postgres");
export const POSTGRES_PASSWORD: string = defaultTo<string>(process.env.POSTGRES_PASSWORD, "postgres");
export const POSTGRES_DB: string = defaultTo<string>(process.env.POSTGRES_DB, "postgres");

export const RUNNER_QUEUE_LIMIT: number = defaultTo<number>(toNumber(process.env.RUNNER_QUEUE_LIMIT), 3);

export const DOCKER_REGISTRY_HOST: string = defaultTo<string>(process.env.DOCKER_REGISTRY_HOST, "");
export const DOCKER_REGISTRY_PORT: number = defaultTo<number>(toNumber(process.env.DOCKER_REGISTRY_PORT), -1);

export const GAME_NAME: string = defaultTo<string>(process.env.GAME_NAME, "Chess");
export const GAME_SERVER_HOST: string = defaultTo<string>(process.env.GAME_SERVER_HOST, "localhost");
export const GAME_SERVER_GAME_PORT: number = defaultTo<number>(toNumber(process.env.GAME_SERVER_GAME_PORT), 3000);
export const GAME_SERVER_API_PORT: number = defaultTo<number>(toNumber(process.env.GAME_SERVER_API_PORT), 3080);

export const RETRY_ATTEMPTS: number = defaultTo<number>(toNumber(process.env.RETRY_ATTEMPTS), 5);
export const TIMEOUT: number = defaultTo<number>(toNumber(process.env.TIMEOUT), 5000);

export const PORT: number = defaultTo<number>(toNumber(process.env.PORT), 8080);
