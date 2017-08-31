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
export interface IGameServerStatus {
    status: "empty" | "open" | "running" | "over" | "error";
    gameName: string;
    gameSession: string;
    gamelogFilename: string;
    numberOfPlayers: number;
    clients: IGameServerClient[];
}
export interface IGameServerError {
    error: string;
    gameName?: string;
}

export type GameStatus = "starting" | "in_progress" | "ending" | "complete";
export interface ITeam { id: number; name: string; }
export interface IGameSubmission {
    id: number;
    team: ITeam;
    image: string;
    version: number;
    output_url?: string;
}
export interface IGame {
    id: number;
    submissions: IGameSubmission[];
    winner?: IGameSubmission;
    win_reason?: string;
    lose_reason?: string;
    status: GameStatus;
    log_url?: string;
    start_time: number;
    end_time?: number;
}
