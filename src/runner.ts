import * as Docker from "dockerode";
import * as winston from "winston";

import { game_failed, get_game_stream, IGame, make_play_game } from "./Game";
import { IGameServerOptions } from "./GameServer";
import { async_foreach, consumer, delay, send } from "./helpers";
import { RUNNER_QUEUE_LIMIT } from "./vars";

export interface IRunnerOptions {
    docker_options: Docker.DockerOptions;
    game_server_options: IGameServerOptions;
    queue_limit: number;
}

/**
 * The runner is responsible for ingesting games into a queue and
 * running a match from the game description.
 *
 * @export
 */
export class Runner {

    public games: IGame[];
    private docker: Docker;
    private docker_options: Docker.DockerOptions;
    private game_server_options: IGameServerOptions;
    private queue_limit: number;

    /**
     * Creates an instance of Runner.
     */
    constructor({ docker_options, game_server_options, queue_limit = RUNNER_QUEUE_LIMIT }: IRunnerOptions) {
        this.docker = new Docker();
        this.docker_options = docker_options;
        this.game_server_options = game_server_options;
        this.games = [];
        this.queue_limit = queue_limit;
    }

    /**
     * Creates queue of games from the incoming stream of games. For
     * each game in the queue, a match is played. Once the match has
     * been initiated, the game id and status is logged.
     */
    public async run(): Promise<void> {
        const queued_games = this.enqueue_games(get_game_stream());
        const play_game = make_play_game(this.docker, this.docker_options, this.game_server_options);
        const played_games = async_foreach(queued_games, play_game, game_failed);
        send(played_games, consumer<IGame, void>(({ id, status }: IGame): void => { winston.info(`Game ${id} is ${status}`); }));
    }

    /**
     * Creates a queue by rate limiting the number of games
     * ingested from a stream of incoming games.
     */
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
