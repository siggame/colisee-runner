import * as Docker from "dockerode";
import * as _ from "lodash";
import * as winston from "winston";

import * as db from "../db";
import { get_game_info, IGameServerOptions } from "../GameServer";
import { IGame } from "./game";

export function make_play_game(
    docker: Docker,
    docker_options: Docker.DockerOptions,
    game_server_options: IGameServerOptions,
): (game: IGame) => Promise<IGame> {
    return async (game: IGame) => {
        // pull client images
        await prepare_game_clients(docker, docker_options, game);

        game.status = "playing";

        // run client containers
        await run_game_clients(docker, game_server_options, game);

        game.end_time = Date.now();
        // TODO: get and set location of output
        game.submissions.forEach((sub) => {
            sub.output_url = "ahh";
        });

        await db.updateSubmissions(game);

        const { clients, gamelogFilename } = await get_game_info(game_server_options, game.id);
        const winner_index = _.findIndex(clients, ({ won }) => won);
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

function prepare_game_clients(
    docker: Docker,
    options: Docker.DockerOptions,
    { submissions }: IGame,
) {
    return Promise.all(
        submissions.map(async ({ image, version }) => {
            const pullOutput: NodeJS.ReadableStream = await docker.pull(`${image}:${version}`, options);
            pullOutput.pipe(process.stdout);
            return new Promise((res, rej) => {
                pullOutput.on("end", res);
            });
        }),
    ).catch((e) => { winston.error("Pull Failed\n", e); throw e; });
}

function run_game_clients(
    docker: Docker,
    { hostname, game_port, network_name }: IGameServerOptions,
    { submissions, id }: IGame,
) {
    return Promise.all(
        submissions.map(async ({ image, version, team: { name } }) => {
            // TODO: file stream or stream to remote log needs to be made
            const container = await docker.run(`${image}:${version}`,
                ["-n", `${name}`, "-s", `${hostname}:${game_port}`, "-r", `${id}`],
                process.stdout, { HostConfig: { NetworkMode: network_name } });
            const data = await container.remove();
            if (data) {
                winston.info("Client Data\n", data);
            }
        }),
    ).catch((e) => { winston.error("Run Failed\n", e); throw e; });
}
