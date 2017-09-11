import * as Docker from "dockerode";
import * as _ from "lodash";
import * as winston from "winston";

import * as db from "./db";
import { game_failed, get_game_stream, IGame, make_play_game } from "./Game";
import { IGameServerOptions } from "./GameServer";
import { async_foreach, consumer, delay, send } from "./helpers";
import { RUNNER_QUEUE_LIMIT } from "./vars";

export interface IRunnerOptions {
    docker_options: Docker.DockerOptions;
    game_server_options: IGameServerOptions;
    queue_limit: number;
}

export class Runner {

    public games: IGame[];
    private docker: Docker;
    private docker_options: Docker.DockerOptions;
    private game_puller: IterableIterator<void>;
    private game_queue: AsyncIterableIterator<IGame>;
    private game_server_options: IGameServerOptions;
    private queue_limit: number;

    constructor({ docker_options, game_server_options, queue_limit = RUNNER_QUEUE_LIMIT }: IRunnerOptions) {
        this.docker = new Docker();
        this.docker_options = docker_options;
        this.game_server_options = game_server_options;
        this.games = [];
        this.queue_limit = queue_limit;
    }

    public async run(): Promise<void> {
        const queued_games = this.enqueue_games(get_game_stream());
        const play_game = make_play_game(this.docker, this.docker_options, this.game_server_options);
        const played_games = async_foreach(queued_games, play_game, game_failed);
        send(played_games, consumer(({ id, status }: IGame) => winston.info(`${id} ${status}`)));
    }

    private async *enqueue_games(game_queue: AsyncIterableIterator<IGame>) {
        while (true) {
            if (this.games.length < this.queue_limit) {
                const { value: new_game } = await game_queue.next();
                this.games.push(new_game);
                yield new_game;
            } else {
                this.games = this.games.filter(({ status }) => status === "playing");
                await delay(10);
            }
        }
    }
}
