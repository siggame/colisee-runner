import * as Docker from "dockerode";
import * as winston from "winston";

import * as db from "../db";
import { IGame } from "../Game";
import { GameServer, IGameServerOptions } from "../GameServer";
import { CLIENT_TIMEOUT } from "../vars";
import { Client } from "./client";

export class Player {

    private game_server: GameServer;

    constructor(game_server_options: IGameServerOptions, private options: Docker.DockerOptions) {
        this.game_server = new GameServer(game_server_options);
    }

    public async play(game: IGame) {
        const clients: Client[] = [];
        try {
            // create a fix client player index (ie player number, 0 -> player 1; 1 -> player 2)
            // just be consistent with the ordering, matchmaking will take care of the rest
            clients.push(...game.submissions
                .sort((sub_a, sub_b) => sub_a.id - sub_b.id)
                .map((sub, index) => new Client(index, sub, this.game_server, game.id, this.options)),
            );
            if (clients.length === 0) { throw new Error("No clients to play with"); }
            await this.pull_clients(clients);
            game.status = "playing";
            await this.run_clients(clients);
            game.end_time = Date.now();
            await db.updateSubmissions(game);
            const { winner, losers: [some_loser], game_log_filename: output_url } = await this.game_server.get_game_info(game.id);
            if (winner) {
                game.winner = game.submissions.find((submission) => submission.team.name === winner.name);
                game.win_reason = winner.reason;
            }
            game.lose_reason = some_loser.reason;
            game.log_url = output_url;
            await db.updateEndedGame(game);
            game.status = "finished";
        } catch (error) {
            winston.error("Game Failure\n", game, "\n", error);
            await this.game_failed(clients, game);
        }
    }

    private async pull_clients(clients: Client[]) {
        try {
            await Promise.all(clients.map(async (client) => await client.pull()));
        } catch (error) {
            winston.error("Pull Failed");
            throw error;
        }
    }

    private async run_clients(clients: Client[]) {
        try {
            await Promise.all(clients.map(async (client) => await client.run(CLIENT_TIMEOUT)));
        } catch (error) {
            winston.error("Run Failed");
            throw error;
        }
    }

    private async game_failed(clients: Client[], game: IGame) {
        try {
            await Promise.all(clients.map(async (client) => await client.stop()));
        } catch (error) {
            winston.error("unable to stop clients\n", clients, "\n", error);
        }
        await db.updateFailedGame(game);
        game.status = "failed";
    }
}
