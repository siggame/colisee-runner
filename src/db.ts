import * as knex from "knex";
import * as _ from "lodash";
import { IGame, IGameSubmission, ITeam } from "./Game";
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

export async function updateFailedGame({ id }: IGame) {
    return query.transaction(async (trx) =>
        query("games")
            .transacting(trx)
            .update({ status: "failed" })
            .where({ id })
            .thenReturn(),
    ).catch((e) => { throw e; });
}

export async function updateEndedGame({ id, log_url, lose_reason, winner, win_reason }: IGame) {
    if (winner === undefined) { throw TypeError("Winner is undefined."); }
    const { team: { id: winner_id } } = winner;
    return query.transaction(async (trx) =>
        query("games")
            .transacting(trx)
            .update({ log_url, lose_reason, status: "finished", winner_id, win_reason })
            .where({ id })
            .thenReturn(),
    ).catch((e) => { throw e; });
}

export async function updateSubmissions({ submissions }: IGame) {
    return query.transaction(async (trx) =>
        Promise.all(
            submissions.map(
                ({ id, output_url }: IGameSubmission) =>
                    query("game_submissions").transacting(trx).update({ output_url }, "*").where({ id })),
        ),
    ).catch((e) => { throw e; });
}

export async function getScheduledGame(): Promise<IGame | undefined> {
    const queued_games = query("games").select("id").where({ status: "scheduled" }).orderBy("created_time").limit(1);
    return query.transaction(async (trx): Promise<any> => {
        const [game_info] = await query("games")
            .transacting(trx)
            .update({ status: "playing" }, "*")
            .whereIn("id", queued_games)
            .then((rows): any[] => rows);
        if (game_info === undefined) { throw new TypeError("game_info is undefined."); }
        const submissions = await getGameSubmissions(trx, game_info.id);
        if (submissions.length < 2) { throw new Error(`Not enough submissions. (${submissions.length})`); }
        return {
            id: game_info.id,
            start_time: Date.now(),
            status: "starting",
            submissions,
        };
    }).catch((e) => undefined);
}

async function getGameSubmissions(trx: knex.Transaction, game_id: number): Promise<IGameSubmission[]> {
    const subs = await query("game_submissions")
        .transacting(trx)
        .where({ game_id })
        .join("submissions", "game_submissions.submission_id", "submissions.id")
        .select("game_submissions.id as id", "submissions.image_name as image",
        "submissions.version as version", "submissions.team_id as team")
        .orderBy("team");
    const teams: ITeam[] = await query("teams")
        .transacting(trx)
        .select("id", "name")
        .where("id", "IN", subs.map((sub: any) => sub.team))
        .orderBy("id");
    return subs.map((sub: any, i: number): IGameSubmission => {
        sub.team = teams[i];
        return sub;
    });
}
