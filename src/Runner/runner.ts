import * as Docker from "dockerode";
import * as winston from "winston";

import { GameQueue } from "../Game";
import { IGameServerOptions } from "../GameServer";
import { Player } from "../Player";
import { RUNNER_QUEUE_LIMIT } from "../vars";

export interface IRunnerOptions {
    docker_options: Docker.DockerOptions;
    game_server_options: IGameServerOptions;
    queue_limit: number;
}

export class Runner {

    private player: Player;
    private pulling: boolean;
    private queue: GameQueue;
    private stream?: Promise<void>;

    constructor({ docker_options, game_server_options, queue_limit = RUNNER_QUEUE_LIMIT }: IRunnerOptions) {
        this.player = new Player(game_server_options, docker_options);
        this.pulling = false;
        this.queue = new GameQueue(queue_limit);
    }

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
