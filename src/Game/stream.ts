import "core-js/modules/es7.symbol.async-iterator";

import * as db from "../db";
import { delay, filter, foreach, generate, infinite, map, not_nil } from "../helpers";
import { IGame, is_game } from "./game";

/**
 * Creates a stream of games. An attempt to add a new game to the stream
 * is delayed by ms milliseconds.
 *
 * @export
 * @param {number} [ms=100] Delay in ms.
 * @returns {AsyncIterableIterator<IGame>} Stream of games.
 */
export function get_game_stream(ms: number = 100): AsyncIterableIterator<IGame> {
    const games = map(generate(delay, ms), (ignore: any) => db.getQueuedGame(), (e, value) => { throw e; });
    return filter(games, is_game);
}
