import * as Docker from "dockerode";
import * as winston from "winston";

import * as db from "../db";
import { IGame } from "../Game";
import { GameServer, IGameServerOptions } from "../GameServer";
import { async_foreach, map } from "../helpers";
import { Client } from "./client";

export interface IPlayableGame {
    clients: Client[];
    game: IGame;
}

/**
 * Player which communicates with Docker to run clients
 *
 * @export
 * @class Player
 * @extends {Docker}
 */
export class Player extends Docker {

    private game_server: GameServer;
    private playable_game_queue: AsyncIterableIterator<IPlayableGame>;

    /**
     * Creates an instance of Player.
     * @param {AsyncIterableIterator<IGame>} game_queue
     * @param {IGameServerOptions} game_server_options
     * @param {Docker.DockerOptions} [options]
     * @memberof Player
     */
    constructor(
        game_queue: AsyncIterableIterator<IGame>,
        game_server_options: IGameServerOptions,
        options?: Docker.DockerOptions,
    ) {
        super(options);
        this.game_server = new GameServer(game_server_options);
        this.playable_game_queue = map(game_queue,
            async (game: IGame): Promise<IPlayableGame> =>
                ({
                    clients: game.submissions.map((submission) =>
                        new Client(submission, this.game_server, game.id, options ? options : {})),
                    game,
                }),
            async (error, game) => {
                winston.error("unable to create playable game");
                return { clients: [], ...game };
            });
    }

    /**
     * Create the pipeline for playing games from the game queue
     *
     * @returns AsyncIterableIterator<IGame>
     * @memberof Player
     */
    public results() {
        return async_foreach(this.playable_game_queue, (game) => this.play(game), (error, game) => this.game_failed(error, game));
    }

    /**
     * Play a game
     */
    private async play({ clients, game }: IPlayableGame) {
        if (clients.length === 0) { throw new Error("No clients to play with"); }
        // pull client images
        await this.pull_clients(clients);
        game.status = "playing";
        // run client containers
        await this.run_clients(clients);
        game.end_time = Date.now();
        await db.updateSubmissions(game);
        const { winner, loser, gamelogFilename: output_url } = await this.game_server.get_game_info(game.id);
        game.winner = game.submissions.find((submission) => submission.team.name === winner.name);
        game.win_reason = winner.reason;
        game.lose_reason = loser.reason;
        game.log_url = output_url;
        await db.updateEndedGame(game);
        game.status = "finished";
    }

    /**
     * Attempts to pull client images in preparation to run them as containers
     *
     * @private
     * @param {Client[]} clients
     * @returns Promise<void>
     * @memberof Player
     */
    private async pull_clients(clients: Client[]) {
        try {
            await Promise.all(clients.map(async (client) => await client.pull()));
        } catch (error) {
            winston.error("Pull Failed");
            throw error;
        }
    }
    /**
     * Run client image as a container with appropriate params
     *
     * @private
     * @param {Client[]} clients
     * @returns Promise<void>
     * @memberof Player
     */
    private async run_clients(clients: Client[]) {
        try {
            await Promise.all(clients.map(async (client) =>
                await client.run(1 /* TODO: add support for env var? CLIENT_TIMEOUT?? */)),
            );
        } catch (error) {
            winston.error("Run Failed");
            throw error;
        }
    }

    /**
     * Log errors and update db that the game failed
     *
     * @private
     * @param {*} error
     * @param {IGame} game
     * @returns Promise<IGame>
     * @memberof Player
     */
    private async game_failed(error: any, { clients, game }: IPlayableGame) {
        try {
            await Promise.all(clients.map(async (client) => await client.stop()));
        } catch (error) {
            winston.error("unable to stop clients\n", clients, "\n", error);
        }
        winston.error("Game Failure\n", game, "\n", error);
        game.status = "failed";
        await db.updateFailedGame(game);
    }
}
