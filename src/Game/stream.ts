import "core-js/modules/es7.symbol.async-iterator";

import * as db from "../db";
import { delay, filter, foreach, generate, infinite, map, not_nil } from "../helpers";
import { IGame, is_game } from "./game";

/*
 * Generator that produces games.
 */
export function get_game_stream(): AsyncIterableIterator<IGame> {
    const add_delay = async (__: any) => { await delay(10); return; };
    const delayed_events = foreach(infinite(), add_delay, (e) => { throw e; });
    const games = map(delayed_events, (__: any) => db.getQueuedGame(), (e) => { throw e; });    
    return filter(games, is_game);
}
