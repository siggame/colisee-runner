import "core-js/modules/es7.symbol.async-iterator";

import * as db from "../db";
import { delay, filter, foreach, generate, infinite, map, not_nil } from "../helpers";
import { IGame, is_game } from "./game";

/*
 * Generator that produces games.
 */
export function get_game_stream(): AsyncIterableIterator<IGame> {
    const games = map(generate(delay, 100), (__: any) => db.getQueuedGame(), (e, value) => { throw e; });
    return filter(games, is_game);
}
