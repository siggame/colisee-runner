import "core-js/modules/es7.symbol.async-iterator";
import * as Docker from "dockerode";

import * as db from "../db";
import { IGameServerOptions } from "../GameServer";
import { delay } from "../helpers";

type GameStatus = "starting" | "in_progress" | "ending" | "complete";

export interface ITeam { id: number; name: string; }

export interface IGameSubmission {
    id: number;
    team: ITeam;
    image: string;
    version: number;
    output_url?: string;
}

export interface IGame {
    id: number;
    submissions: IGameSubmission[];
    winner?: IGameSubmission;
    win_reason?: string;
    lose_reason?: string;
    status: GameStatus;
    log_url?: string;
    start_time: number;
    end_time?: number;
}

/*
 * Generator that produces games.
 */
export async function* gen_game_queue(puller: IterableIterator<void>): AsyncIterableIterator<IGame> {
    while (true) {
        const game = await db.getQueuedGame();
        if (game) {
            puller.next();
            yield game;
        } else {
            await delay(500);
        }
    }
}

/**
 * Generator used to recieve notifications that a new game is
 * available in the queue.
 */
export function* gen_game_puller(): IterableIterator<void> {
    while (true) { yield; }
}

/*
 * Generator that takes a queue and upon seeing new games, plays the game.
 */
export async function* play_games(game_queue: AsyncIterableIterator<IGame>, play: (game: IGame) => Promise<IGame>)
    : AsyncIterableIterator<IGame> {
    for await (const game of game_queue) {
        yield play(game).catch(async (e) => {
            console.error(e);
            await db.updateFailedGame(game);
            game.status = "complete";
            return game;
        });
    }
}

export function prepare_clients(docker: Docker, options: Docker.DockerOptions, { submissions }: IGame) {
    return Promise.all(
        submissions.map(({ image, version }) =>
            docker.pull(`${image}:${version}`, options),
        ),
    ).catch((error) => { throw error; });
}

export function run_clients(docker: Docker, { hostname, game_port }: IGameServerOptions, { submissions, id }: IGame) {
    return Promise.all(
        submissions.map(({ image, version, team: { name } }) => {
            // TODO: file stream or stream to remote log needs to be made
            return docker.run(`${image}:${version}`,
                ["-n", `${name}`, "-s", `${hostname}:${game_port}`, "-r", `${id}`],
                process.stdout, {});
        }),
    ).catch((error) => { throw error; });
}
