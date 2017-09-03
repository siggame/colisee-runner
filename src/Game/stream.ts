import "core-js/modules/es7.symbol.async-iterator";

import * as db from "../db";
import { delay, filter, generate, identity, map, not_nil } from "../helpers";
import { IGame, is_game } from "./game";

/*
 * Generator that produces games.
 */
export function get_game_stream(): AsyncIterableIterator<IGame> {
    const add_delay = async (value: IGame) => { await delay(10); return value; };
    const games = filter(generate(db.getQueuedGame), is_game);
    return map(games, add_delay,
        (e, value) => {
            console.log("Stream Delay Failed\n", value, "\n", e); throw e;
        });
}
