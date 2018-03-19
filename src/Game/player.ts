import * as Docker from "dockerode";
import * as fs from "fs";
import { findIndex } from "lodash";
import { basename } from "path";
import { PassThrough } from "stream";
import * as winston from "winston";
import * as zlib from "zlib";

import * as db from "../db";
import { get_game_info, IGameServerClient, IGameServerOptions } from "../GameServer";
import { delay } from "../helpers";
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

        game.status = "playing";

        // run client containers
        await run_game_clients(docker, game_server_options, game);

        game.end_time = Date.now();

        await db.updateSubmissions(game);

        const { clients, gamelogFilename } = await get_game_info(game_server_options, game.id);
        const winner_index = findIndex(clients, ({ won }: IGameServerClient) => won);
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

function prepare_output({ submissions }: IGame) {
    return submissions.map(({ log, output_url, team, version, id: sub_id, ...rest }): IGameSubmission => {
        const filename = `client_${team.id}_${version}_${sub_id}.log.gz`;
        output_url = `/runner/${basename(OUTPUT_DIR)}/${filename}`;
        const client_log = fs.createWriteStream(`${OUTPUT_DIR}/${filename}`);
        const compressor = zlib.createGzip();
        log = new PassThrough();
        log.pipe(compressor).pipe(client_log);
        return { log, id: sub_id, output_url, team, version, ...rest };
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

function run_game_clients(
    docker: Docker,
    { hostname, game_port, network_name }: IGameServerOptions,
    { submissions, id: game_id }: IGame,
) {
    return Promise.all(
        submissions.map(async function ({ id: sub_id, image, log, version, team: { name, id: team_id } }) {
            if (log) {
                const temp = new PassThrough();
                temp.pipe(log, { end: false });
                try {
                    const on_time = await Promise.race([
                        delay(15 * 60 * 1000).then(_ => false),
                        docker.run(`${image}`,
                            ["-n", `${name}`, "-s", `${hostname}:${game_port}`, "-r", `${game_id}`],
                            temp, {
                                HostConfig: { AutoRemove: true, NetworkMode: network_name },
                                StopTimeout: 1,
                                name: `team_${team_id}_${sub_id}`,
                            },
                        ).then(_ => true),
                    ]);
                    if (!on_time) {
                        winston.error("client timeout reached");
                        log.write("\n\ntimeout reached");
                        const [container] = await docker.listContainers({ limit: 1, filters: { name: `/team_${team_id}_${sub_id}` } });
                        try {
                            await docker.getContainer(container.Id).stop();
                        } catch (error) {
                            winston.error("failed to stop container");
                        }
                    }
                } catch (error) {
                    throw error;
                } finally {
                    log.end();
                }
            }
        }),
    ).catch((e) => { winston.error("Run Failed"); throw e; });
}
