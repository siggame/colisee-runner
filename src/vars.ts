import * as _ from "lodash";

export const POSTGRES_HOST: string = _.defaultTo<string>(process.env.POSTGRES_HOST, "localhost");
export const POSTGRES_PORT: number = _.defaultTo<number>(_.toNumber(process.env.POSTGRES_PORT), 5432);
export const POSTGRES_USER: string = _.defaultTo<string>(process.env.POSTGRES_USER, "postgres");
export const POSTGRES_PASSWORD: string = _.defaultTo<string>(process.env.POSTGRES_PASSWORD, "postgres");
export const POSTGRES_DB: string = _.defaultTo<string>(process.env.POSTGRES_DB, "postgres");

export const RUNNER_QUEUE_LIMIT: number = _.defaultTo<number>(_.toNumber(process.env.RUNNER_QUEUE_LIMIT), 3);

export const GAME_NAME: string = _.defaultTo<string>(process.env.GAME_NAME, "Chess");
export const GAME_SERVER_HOSTNAME: string = _.defaultTo<string>(process.env.GAME_SERVER_HOSTNAME, "http://localhost");
export const GAME_SERVER_GAME_PORT: number = _.defaultTo<number>(_.toNumber(process.env.GAME_SERVER_GAME_PORT), 3000);
export const GAME_SERVER_API_PORT: number = _.defaultTo<number>(_.toNumber(process.env.GAME_SERVER_API_PORT), 3080);

export const RETRY_ATTEMPTS: number = _.defaultTo<number>(_.toNumber(process.env.RETRY_ATTEMPTS), 5);
export const TIMEOUT: number = _.defaultTo<number>(_.toNumber(process.env.TIMEOUT), 5000);
