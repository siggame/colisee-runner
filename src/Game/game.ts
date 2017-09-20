import { not_nil } from "../helpers";

type GameStatus = "queued" | "playing" | "finished" | "failed";

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

/**
 * Asserts that value is an IGame and not null.
 *
 * @export
 * @param {(IGame | undefined | null)} value
 * @returns {value is IGame}
 */
export function is_game(value: IGame | undefined | null): value is IGame {
    return not_nil<IGame>(value);
}
