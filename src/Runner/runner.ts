import * as Docker from "dockerode";
import * as winston from "winston";

import { get_game_stream, IGame } from "../Game";
import { IGameServerOptions } from "../GameServer";
import { consumer, delay, send } from "../helpers";
import { IPlayableGame, Player } from "../Player";
import { RUNNER_QUEUE_LIMIT } from "../vars";

export interface IRunnerOptions {
    docker_options?: Docker.DockerOptions;
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
    private player: Player;
    private queue_limit: number;

    /**
     * Creates an instance of Runner.
     */
    constructor({ docker_options, game_server_options, queue_limit = RUNNER_QUEUE_LIMIT }: IRunnerOptions) {
        this.games = [];
        this.queue_limit = queue_limit;
        const queued_games = this.enqueue_games(get_game_stream());
        this.player = new Player(queued_games, game_server_options, docker_options);
    }

    /**
     * Creates queue of games from the incoming stream of games. For
     * each game in the queue, a match is played. Once the match has
     * been initiated, the game id and status is logged.
     */
    public run() {
        return send(this.player.results(),
            consumer(({ game: { id, status } }: IPlayableGame): void => {
                winston.info(`Game ${id} is ${status}`);
            }),
        );
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
                this.games = this.games.filter(({ status }) => status === "playing" || status === "queued");
                await delay(100);
            }
        }
    }
}
