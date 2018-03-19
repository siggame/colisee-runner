import * as Docker from "dockerode";
import * as winston from "winston";

import { GameQueue, IGame } from "../Game";
import { IGameServerOptions } from "../GameServer";
import { consumer, delay, send } from "../helpers";
import { IPlayableGame, Player } from "../Player";
import { RUNNER_QUEUE_LIMIT } from "../vars";

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

    private player: Player;
    private pulling: boolean;
    private queue: GameQueue;
    private stream?: Promise<void>;

    /**
     * Creates an instance of Runner.
     */
    constructor({ docker_options, game_server_options, queue_limit = RUNNER_QUEUE_LIMIT }: IRunnerOptions) {
        this.player = new Player(game_server_options, docker_options);
        this.pulling = false;
        this.queue = new GameQueue(queue_limit);
    }

    /**
     * Creates queue of games from the incoming stream of games. For
     * each game in the queue, a match is played. Once the match has
     * been initiated, the game id and status is logged.
     */
    public start() {
        if (this.stream == null) {
            this.stream = this.pull();
            this.pulling = true;
        }
    }

    public async stop() {
        if (this.stream && this.pulling) {
            this.pulling = false;
            await this.stream;
            this.stream = undefined;
        }
    }

    private async pull() {
        for await (const game of this.queue.stream()) {
            // needs to signal the queue that a game is being played
            this.queue.hold();
            winston.info(`game ${game.id} is ${game.status}`);
            (async () => {
                try {
                    await this.player.play(game);
                } finally {
                    // signal the queue that a game has finished
                    this.queue.release();
                }
            })();
            if (!this.pulling) { break; }
        }
        winston.info("stopped pulling enqueued games");
    }
}
