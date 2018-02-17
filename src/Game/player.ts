import * as Docker from "dockerode";
import * as fs from "fs";
import * as _ from "lodash";
import { basename } from "path";
import { PassThrough } from "stream";
import * as winston from "winston";
import * as zlib from "zlib";

import * as db from "../db";
import { get_game_info, IGameServerClient, IGameServerOptions } from "../GameServer";
import { OUTPUT_DIR } from "../vars";
import { IGame, IGameSubmission } from "./game";

/**
 * Creates an asynchronous function to play a game.
 *
 * @export
 */
export function make_play_game(
    docker: Docker,
    docker_options: Docker.DockerOptions,
    game_server_options: IGameServerOptions,
): (game: IGame) => Promise<IGame> {
    return async (game: IGame) => {
        game.submissions = prepare_output(game);

        // pull client images
        await prepare_game_clients(docker, docker_options, game);

        // wait to clean up after misbehaving clients
        delayed_client_cleanup(docker, game, 30);

        game.status = "playing";

        // run client containers
        await run_game_clients(docker, game_server_options, game);

        game.end_time = Date.now();

        await db.updateSubmissions(game);

        const { clients, gamelogFilename } = await get_game_info(game_server_options, game.id);
        const winner_index = _.findIndex(clients, ({ won }: IGameServerClient) => won);
        const [winner, loser] = (winner_index === 0 ? clients : clients.reverse());
        game.winner = game.submissions.find(({ team: { name } }) => name === winner.name);
        game.win_reason = winner.reason;
        game.lose_reason = loser.reason;
        game.log_url = gamelogFilename;

        await db.updateEndedGame(game);

        game.status = "finished";

        return game;
    };
}

export async function game_failed(error: any, game: IGame) {
    winston.error("Game Failure\n", game, "\n", error);
    game.status = "failed";
    await db.updateFailedGame(game);
    return game;
}

function prepare_output({ submissions, id }: IGame) {
    return submissions.map(({ log, output_url, team, version, ...rest }): IGameSubmission => {
        const filename = `client_${team.id}_${version}_${id}.log.gz`;
        output_url = `runners/${basename(OUTPUT_DIR)}/${filename}`;
        const client_log = fs.createWriteStream(`${OUTPUT_DIR}/${filename}`);
        const compressor = zlib.createGzip();
        log = new PassThrough();
        log.pipe(compressor).pipe(client_log);
        return { log, output_url, team, version, ...rest };
    });
}

function prepare_game_clients(
    docker: Docker,
    options: Docker.DockerOptions,
    { submissions, id }: IGame,
) {
    return Promise.all(
        submissions.map(async ({ image, log, version }): Promise<any> => {
            const pullOutput: NodeJS.ReadableStream = await docker.pull(`${image}`, options);
            if (log) {
                pullOutput.pipe(log, { end: false });
            }
            return new Promise((res, rej) => {
                pullOutput.on("end", res);
            });
        }),
    ).catch((e) => { winston.error("Pull Failed"); throw e; });
}

function delayed_client_cleanup(docker: Docker, { id, submissions }: IGame, timeout: number) {
    const game_client_names = submissions.map(({ team: { id: team_id } }) =>
        `/team_${team_id}_${id}`,
    );
    setTimeout(() => {
        docker.listContainers((error, containers) => {
            if (containers) {
                const game_clients = containers.filter((container) =>
                    game_client_names.some((name) => container.Names.indexOf(name) >= 0),
                );
                if (game_clients.some((client) => client.Status !== "running")) {
                    game_clients.forEach((client) => {
                        docker.getContainer(client.Id).remove({ force: true }, (error, container) => {
                            winston.info("stopping and removing container", container);
                        });
                    });
                }
            }
        });
    }, timeout * 1000);
}

function run_game_clients(
    docker: Docker,
    { hostname, game_port, network_name }: IGameServerOptions,
    { submissions, id }: IGame,
) {
    return Promise.all(
        submissions.map(async ({ image, log, version, team: { name, id: team_id } }) => {
            if (log) {
                const container: Docker.Container = await docker.run(`${image}`,
                    ["-n", `${name}`, "-s", `docker.for.mac.${hostname}:${game_port}`, "-r", `${id}`],
                    log, { name: `team_${team_id}_${id}`, HostConfig: { NetworkMode: network_name } });
                const info = await container.inspect();
                const data: fs.ReadStream = await container.remove({ force: true });
                if (data) {
                    winston.info(`Removing ${image}`);
                    data.on("data", (chunk) => {
                        winston.info(chunk.toString("utf8"));
                    });
                }
                if (info.State.ExitCode === 127) {
                    throw new Error(`Entrypoint command failed for image ${image}.`);
                }
            }
        }),
    ).catch((e) => { winston.error("Run Failed"); throw e; });
}
