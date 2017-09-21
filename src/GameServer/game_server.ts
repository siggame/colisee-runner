import * as request from "request-promise-native";

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
export async function get_game_info({ hostname, api_port, game_name }: IGameServerOptions, sessionId: number): Promise<IGameServerStatus> {
    return request.get(`http://${hostname}:${api_port}/status/${game_name}/${sessionId}`)
        .then((body): IGameServerStatus => {
            const { gamelogFilename, ...rest }: IGameServerStatus = JSON.parse(body);
            return {
                gamelogFilename: `${hostname}:${api_port}/gamelog/${gamelogFilename}`,
                ...rest,
            };
        }).catch((e) => { throw e; });
}
