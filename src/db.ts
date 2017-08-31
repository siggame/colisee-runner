import * as knex from "knex";
import * as _ from "lodash";
import { IGame, IGameSubmission, ITeam } from "./game";
import { POSTGRES_DB, POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_PORT, POSTGRES_USER } from "./vars";

export const query = knex({
    client: "pg",
    connection: {
        database: POSTGRES_DB,
        host: POSTGRES_HOST,
        password: POSTGRES_PASSWORD,
        port: POSTGRES_PORT,
        user: POSTGRES_USER,
    },
});

export async function updateEndedGame({ id, log_url, lose_reason, winner, win_reason }: IGame) {
    if (winner === undefined) { throw TypeError("Winner is undefined."); }
    const { team: { id: winner_id } } = winner;
    return query("games")
        .update({ log_url, lose_reason, status: "finished", winner_id, win_reason })
        .where({ id })
        .then((rows): any[] => rows);
}

export async function updateSubmissions({ submissions }: IGame) {
    return Promise.all(
        submissions.map(
            ({ id, output_url }: IGameSubmission) =>
                query("game_submissions").update({ output_url }, "*").where({ id }).thenReturn()),
    );
}

export async function getScheduledGame() {
    const queued_games = query("games").select("id").where({ status: "scheduled" }).orderBy("created_time").limit(1);
    return query("games")
        .update({ status: "playing" }, "*")
        .whereIn("id", queued_games)
        .then((rows): any[] => rows);
}

export async function getGameSubmissions(game_id: number): Promise<IGameSubmission[]> {
    const subs = await query("game_submissions")
        .where({ game_id })
        .join("submissions", "game_submissions.submission_id", "submissions.id")
        .select("game_submissions.id as id", "submissions.image_name as image",
        "submissions.version as version", "submissions.team_id as team")
        .orderBy("team")
        .then((rows) => rows);
    const teams = await query("teams")
        .select("id", "name")
        .where("id", "IN", subs.map((sub: any) => sub.team))
        .orderBy("id")
        .then((ts: ITeam[]) => ts);
    return subs.map((sub: any, i: number): IGameSubmission => {
        sub.team = teams[i];
        return sub;
    });
}
