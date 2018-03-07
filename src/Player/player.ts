import * as Docker from "dockerode";
import { Readable } from "stream";
import * as winston from "winston";

import * as db from "../db";
import { IContainer, IListContainerFilter } from "../Docker";
import { IGame } from "../Game";
import { GameServer, IGameServerOptions } from "../GameServer";
import { async_foreach, delay } from "../helpers";
import { createClient } from "./client";

/**
 * Player which communicates with Docker to run clients
 *
 * @export
 * @class Player
 * @extends {Docker}
 */
export class Player extends Docker {

    private game_server: GameServer;
    private game_queue: AsyncIterableIterator<IGame>;

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
        this.game_queue = game_queue;
    }

    /**
     * Create the pipeline for playing games from the game queue
     *
     * @returns AsyncIterableIterator<IGame>
     * @memberof Player
     */
    public results() {
        return async_foreach(this.game_queue, (game) => this.play(game), (error, game) => this.game_failed(error, game));
    }

    /**
     * Play a game
     */
    private async play(game: IGame) {
        // TODO: make clients a part of the game interface:
        // the benefits end up being that the clean up after a game becomes simpler
        // as the clients are then passed to the game_failed handler
        const clients = game.submissions.map((submission) => createClient(submission, this.game_server, game.id));
        // wait to clean up after misbehaving clients
        this.delayed_client_cleanup(clients, 60/* seconds */);
        // pull client images
        await this.pull_clients(clients);
        // run client containers
        await this.run_clients(clients);
        game.status = "playing";
        game.end_time = Date.now();
        await db.updateSubmissions(game);
        const { winner, loser, gamelogFilename: output_url } = await this.game_server.get_game_info(game.id);
        game.winner = game.submissions.find((submission) => submission.team.name === winner.name);
        game.win_reason = winner.reason;
        game.lose_reason = loser.reason;
        game.log_url = output_url;
        await db.updateEndedGame(game);
        game.status = "finished";
        return game;
    }

    /**
     * Invoke a cleanup of the game when clients behave badly.
     * The assumption is that if they are both running then they are behaving correctly.
     * Otherwise, stop and remove the clients that are not already removed.
     *
     * @private
     * @param {IContainer[]} clients
     * @param {number} seconds
     * @returns Promise<void>
     * @memberof Player
     */
    private async delayed_client_cleanup(clients: IContainer[], seconds: number) {
        await delay(seconds * 1000);
        // need to add '/' prefix as that is appended to the container names
        const filter_by_name: IListContainerFilter = { name: clients.map((client) => `/${client.createOptions.name}`) };
        // TODO: add filters interface corresponding to container list api
        // https://docs.docker.com/engine/api/v1.36/#operation/ContainerList
        const client_containers = await this.listContainers({ all: true, filters: filter_by_name })
            .catch((error) => { winston.error("could not get list of containers", error); throw error; });

        if (clients.length !== client_containers.length || !client_containers.every((client) => client.State === "running")) {
            return Promise.all(client_containers.filter((client) =>
                client.State === "running" || client.State === "created",
            ).map(async (client) => {
                let container;
                try {
                    container = this.getContainer(client.Id);
                } catch (error) {
                    winston.error(`failed getting client container ${client.Names}`); throw error;
                }
                const info = await container.inspect();
                if (info.State.Status !== "removing") {
                    await container.remove({ force: true });
                    winston.info(`removing orphaned container ${info.Name} `);
                }
            })).catch((error) => { winston.error("Cleanup failed", error); });
        }
    }

    /**
     * Attempts to pull client images in preparation to run them as containers
     *
     * @private
     * @param {IContainer[]} clients
     * @returns Promise<void[]>
     * @memberof Player
     */
    private pull_clients(clients: IContainer[]) {
        return Promise.all(
            clients.map(async ({ image, outputStream: log }) => {
                const pull_output: Readable = await this.pull(`${image}`, {/* TODO: needed for auth stuff in future */ });
                // don't close the log stream as it still needs to be written to later
                pull_output.pipe(log, { end: false });
                return new Promise<void>((res, rej) => {
                    pull_output.on("end", res);
                    pull_output.on("error", rej);
                }).catch((error) => {
                    log.write(`\n\n${JSON.stringify(error)}`);
                    log.end();
                    throw error;
                });
            }),
        ).catch((error) => { winston.error("Pull Failed"); throw error; });
    }
    /**
     * Run client image as a container with appropriate params
     *
     * @private
     * @param {IContainer[]} clients
     * @returns Promise<void[]>
     * @memberof Player
     */
    private run_clients(clients: IContainer[]) {
        // TODO: add timeout for client execution time:
        // this is important for those clients which end up in an infinite loop
        return Promise.all(
            clients.map(async ({ cmd, createOptions, image, outputStream }) => {
                const container: Docker.Container = await this.run(image, cmd, outputStream, createOptions);
                const info = await container.inspect();

                if (info.State.Status !== "removing") {
                    await container.remove()
                        .catch((error) => { winston.error("Removing failed"); throw error; });
                    winston.info(`Removing ${image} `);
                }
                // container failed when running its entrypoint
                // exit code is a result of chroot
                if (info.State.ExitCode === 127) {
                    throw new Error(`Entrypoint command failed for image ${image}.`);
                }
            }),
        ).catch((error) => { winston.error("Run Failed"); throw error; });
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
    private async game_failed(error: any, game: IGame) {
        winston.error("Game Failure\n", game, "\n", error);
        game.status = "failed";
        await db.updateFailedGame(game);
        return game;
    }
}
