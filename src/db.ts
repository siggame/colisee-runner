import { db } from "@siggame/colisee-lib";
import * as knex from "knex";
import { basename } from "path";
import * as winston from "winston";

import { IGame, IGameSubmission, ITeam } from "./Game";
import { OUTPUT_DIR } from "./vars";

async function getGameSubmissions(trx: knex.Transaction, game_id: number): Promise<IGameSubmission[]> {
    const subs = await db.connection("games_submissions")
        .transacting(trx)
        .where({ game_id })
        .join("submissions", "games_submissions.submission_id", "submissions.id")
        .select("games_submissions.id as id", "submissions.image_name as image",
            "submissions.version as version", "submissions.team_id as team")
        .orderBy("team")
        .then((rows): IGameSubmission[] => rows);
    const teams: ITeam[] = await db.connection("teams")
        .transacting(trx)
        .select("id", "name")
        .whereIn("id", subs.map((sub: any) => sub.team))
        .orderBy("id");
    return subs.map((sub: any, i: number): IGameSubmission => {
        const team = teams.find((team) => team.id === sub.team);
        if (team) {
            sub.team = team;
            const filename = `client_${team.id}_${sub.version}_${sub.id}.log.gz`;
            sub.output_url = `/runner/${basename(OUTPUT_DIR)}/${filename}`;
        } else {
            throw new Error(`no team for ${sub.team} found from db`);
        }
        return sub;
    });
}

/**
 * Attempts to take a game out of the queue by changing the status from
 * "queued" to "playing" and ensuring that at least two game submissions
 * are available for the game. If the transaction fails, then undefined is returned.
 *
 * @export
 */
export async function getQueuedGame(): Promise<IGame | undefined> {
    const queued_game_ids = db.connection("games")
        .select("id")
        .where({ status: "queued" })
        .orderBy("created_at")
        .limit(1)
        .forUpdate();
    return db.connection.transaction(async (trx): Promise<IGame> => {
        const [gameInfo] = await db.connection("games")
            .transacting(trx)
            .update({ status: "playing" }, "*")
            .whereIn("id", queued_game_ids)
            .then(db.rowsToGames);
        if (gameInfo === undefined) { throw new TypeError("gameInfo is undefined."); }
        const submissions = await getGameSubmissions(trx, gameInfo.id);
        if (submissions.length < 2) { throw new Error(`Not enough submissions. (${submissions.length})`); }
        return {
            id: gameInfo.id,
            start_time: Date.now(),
            status: "playing",
            submissions,
        };
    }).catch((error) => undefined);
}

/**
 * Update the fields of a finished game with the values in the game
 * object.
 *
 * @export
 */
export function updateEndedGame({ id, log_url, lose_reason, winner, win_reason }: IGame) {
    if (winner === undefined) { throw TypeError("Winner is undefined."); }
    const { id: winner_id } = winner;
    return db.connection.transaction(async (trx) => {
        await db.connection("games")
            .transacting(trx)
            .update({ log_url, lose_reason, status: "finished", winner_id, win_reason })
            .where({ id });
    }).catch((error) => { winston.error("Update Failure"); throw error; });
}

/**
 * Update the status of a failed game.
 *
 * @export
 */
export function updateFailedGame({ id }: IGame) {
    return db.connection.transaction(async (trx) => {
        await db.connection("games")
            .transacting(trx)
            .update({ status: "failed" })
            .where({ id });
    }).catch((error) => { winston.error("Update Failure"); throw error; });
}

/**
 * Updates the output for a game submission in a given game using
 * the submissions in the game.
 *
 * @export
 */
export function updateSubmissions({ submissions }: IGame) {
    return db.connection.transaction(async (trx) => {
        return await Promise.all(
            submissions.map(({ id, output_url }: IGameSubmission) =>
                db.connection("games_submissions")
                    .transacting(trx)
                    .update({ output_url }, "*")
                    .where({ id }),
            ),
        );
    }).catch((error) => { throw error; });
}

/**
 * Attempts to connect to the database and perform a simple query.
 *
 * @export
 */
export function pingDatabase(): Promise<void> {
    return Promise.resolve(
        db.connection("teams")
            .select("id")
            .limit(1)
            .thenReturn());
}
