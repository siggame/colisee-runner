import * as Docker from "dockerode";
import * as _ from "lodash";

import * as db from "./db";
import { gen_game_puller, gen_game_queue, IGame, play_games, prepare_clients, run_clients } from "./Game";
import { get_game_info, IGameServerClient, IGameServerError, IGameServerOptions, IGameServerStatus } from "./GameServer";
import { delay } from "./helpers";

export interface IRunnerOptions {
    queue_limit: number;
    game_server_options: IGameServerOptions;
    docker_options: Docker.DockerOptions;
}

export class Runner {

    public games: IGame[];
    private docker: Docker;
    private docker_options: Docker.DockerOptions;
    private game_puller: IterableIterator<void>;
    private game_queue: AsyncIterableIterator<IGame>;
    private game_server_options: IGameServerOptions;
    private queue_limit: number;

    constructor({queue_limit, game_server_options, docker_options}: IRunnerOptions) {
        this.docker = new Docker();
        this.game_puller = gen_game_puller();
        this.game_server_options = game_server_options;
        this.docker_options = docker_options;
        this.games = [];
        this.queue_limit = queue_limit;
    }

    public async run(): Promise<void> {
        const queued_games = this.enqueue_games(gen_game_queue(this.game_puller));
        const played_games = play_games(queued_games, async (game: IGame) => {
            // pull client images
            await prepare_clients(this.docker, this.docker_options, game);

            game.status = "in_progress";

            // run client containers
            await run_clients(this.docker, this.game_server_options, game);

            game.status = "ending";
            game.end_time = Date.now();
            game.submissions.forEach((sub) => {
                sub.output_url = "ahh";
            });

            await db.updateSubmissions(game);

            const { clients, gamelogFilename } = await get_game_info(this.game_server_options, game.id);
            const winner_index = _.findIndex(clients, ({ won }) => won);
            const [winner, loser] = (winner_index === 0 ? clients : clients.reverse());
            game.winner = game.submissions.find(({ team: { name } }) => name === winner.name);
            game.win_reason = winner.reason;
            game.lose_reason = loser.reason;
            game.log_url = gamelogFilename;

            await db.updateEndedGame(game);

            game.status = "complete";

            return game;
        });

        for (const $ of this.game_puller) {
            played_games.next();
            await delay(1);
        }
    }

    private async *enqueue_games(game_queue: AsyncIterableIterator<IGame>) {
        while (true) {
            if (this.games.length < this.queue_limit) {
                const {value: new_game} = await game_queue.next();
                this.games.push(new_game);
                yield new_game;
            } else {
                this.games = this.games.filter(({status}) => status !== "complete");
                await delay(1);
            }
        }
    }
}
