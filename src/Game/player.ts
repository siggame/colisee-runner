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

        game.status = "in_progress";

        // run client containers
        await run_game_clients(docker, game_server_options, game);

        game.status = "ending";
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

        game.status = "complete";

        return game;
    };
}

export async function game_failed(error: any, game: IGame) {
    winston.error("Game Failure\n", game, "\n", error);
    await db.updateFailedGame(game);
    game.status = "complete";
    return game;
}

function prepare_game_clients(
    docker: Docker,
    options: Docker.DockerOptions,
    { submissions }: IGame,
) {
    return Promise.all(
        submissions.map(async ({ image, version }) =>
            await docker.pull(`${image}:${version}`, options),
        ),
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
                winston.info("Client Data", data);
            }
        }),
    ).catch((e) => { winston.error("Run Failed", e); throw e; });
}
