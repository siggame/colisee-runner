import "core-js/modules/es7.symbol.async-iterator";

import * as db from "../db";
import { delay, filter, generate, map } from "../helpers";
import { IGame, is_game } from "./game";

/**
 * Creates a stream of games. An attempt to add a new game to the stream
 * is delayed by ms milliseconds.
 *
 * @export
 */
export function get_game_stream(ms: number = 100): AsyncIterableIterator<IGame> {
    const games = map(generate(delay, ms), (ignore: any) => db.getQueuedGame(), (error, value) => { throw error; });
    // TODO: introduce longer delay after many failed attempts to enqueue game
    // the idea being that this will reduce strain on the db as well as the host
    // where the runner is executing, maybe something exponential with an upper bound?
    return filter(games, is_game);
}
