export type MatchStatus = "starting" | "in_progress" | "ending" | "complete";


export interface Match {
    id: number;
    session: number;
    teams: Array<string>;
    winner: string | null;
    loser: string | null;
    status: MatchStatus;
    start_time: Date;
    end_time: Date | null;
}