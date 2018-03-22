import { findIndex } from "lodash";
import * as request from "request-promise-native";
import * as winston from "winston";

export interface IGameServerClient {
    index?: number;
    name: string;
    spectating: boolean;
    disconnected?: boolean;
    timedOut?: boolean;
    won?: boolean;
    lost?: boolean;
    reason?: string;
}

export interface IGameServerError {
    error: string;
    gameName?: string;
}

export interface IGameServerGameInfo {
    losers: IGameServerClient[];
    output_url: string;
    winner?: IGameServerClient;
}

export interface IGameServerOptions {
    api_port: number;
    game_port: number;
    game_name: string;
    hostname: string;
    network_name: string;
}

export interface IGameServerStatus {
    status: "empty" | "open" | "running" | "over" | "error";
    gameName: string;
    gameSession: string;
    gamelogFilename: string;
    numberOfPlayers: number;
    clients: IGameServerClient[];
}

/**
 * Query the game server for information about the session with sessionId.
 *
 * @export
 */
export async function get_game_info(
    { hostname, api_port, game_name }: IGameServerOptions,
    sessionId: number,
): Promise<IGameServerGameInfo> {
    try {
        const { clients, gamelogFilename }: IGameServerStatus = await request({
            json: true,
            url: `http://${hostname}:${api_port}/status/${game_name}/${sessionId}`,
        });
        if (clients.length === 0) { throw new Error("Clients did not connect properly"); }
        const winner_index = findIndex(clients, ({ won }) => won);
        const [winner, ...losers] = [clients[winner_index], ...clients.filter((__, index) => index !== winner_index)];
        return {
            losers,
            output_url: `/game_server/${gamelogFilename}.json.gz`,
            winner,
        };
    } catch (error) {
        winston.error("unable to query game server for game status");
        throw error;
    }
}
