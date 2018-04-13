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
    game_log_filename: string;
    losers: IGameServerClient[];
    winner?: IGameServerClient;
}

export interface IGameServerOptions {
    api_port: number;
    game_port: number;
    game_name: string;
    hostname: string;
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
 * Class to support communication with the game server
 *
 * @export
 * @class GameServer
 */
export class GameServer {

    private api_url: string;
    public game_url: string;

    constructor(public options: IGameServerOptions) {
        this.api_url = `http://${this.options.hostname}:${this.options.api_port}/status/${this.options.game_name}`;
        this.game_url = `${this.options.hostname}:${this.options.game_port}`;
    }

    /**
     * Query the game server for information about the session with sessionId.
     *
     * @param {number} session_id
     * @returns Promise<{
     * gamelogFilename: string,
     * loser: IGameServerClient,
     * winner: IGameServerClient,
     * }>
     * @memberof GameServer
     */
    public async get_game_info(session_id: number): Promise<IGameServerGameInfo> {
        const { clients, gamelogFilename }: IGameServerStatus = await request.get({ json: true, url: `${this.api_url}/${session_id}` })
            .catch((error) => { winston.error("Game server api failure"); throw error; });
        if (clients.length === 0) { throw new Error("Clients did not connect properly"); }
        const winner_index = findIndex(clients, ({ won }: IGameServerClient) => won);
        const [winner, ...losers] = [clients[winner_index], ...clients.filter((__, index) => index !== winner_index)];
        return {
            game_log_filename: `/game_server/${gamelogFilename}.json.gz`,
            losers,
            winner,
        };
    }
}
