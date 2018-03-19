import "core-js/modules/es7.symbol.async-iterator";

import { Deque } from "tstl";

import { delay } from "../helpers";
import { IGame } from "./game";
import { get_game_stream } from "./stream";

export class GameQueue {

    private game_stream: AsyncIterableIterator<IGame>;
    private held: number;

    constructor(private limit: number) {
        this.game_stream = get_game_stream();
        this.held = 0;
    }

    public hold() { this.held++; }
    public release() { this.held--; }

    public async *stream() {
        while (true) {
            if (this.limit > this.held) {
                const { value: game } = await this.game_stream.next();
                yield game;
            } else {
                await delay(100);
            }
        }
    }
}
