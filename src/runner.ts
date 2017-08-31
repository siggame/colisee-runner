import * as Docker from "dockerode";
import * as _ from "lodash";
import * as request from "request-promise";
import * as db from "./db";
import { GameStatus, IGame, IGameServerError, IGameServerStatus } from "./game";
import { GAME_SERVER_API_PORT, GAME_SERVER_GAME_PORT, GAME_SERVER_URL } from "./vars";

export class Runner {

    // TODO: refactor to emit events

    private docker: Docker;
    private game: IGame;

    constructor() {
        this.docker = new Docker();
    }

    public async *run() {
        while (true) {
            const [game_info] = await db.getScheduledGame().catch((error) => {
                console.error(error);
                process.exit(1);
                return [];
            });
            // console.log(game_info);
            if (game_info) {
                this.game = {
                    id: game_info.id,
                    start_time: Date.now(),
                    status: "starting",
                    // BUG: potential for submissions to not yet exist
                    // may be necessary to rollback game to scheduled
                    // or retry query for submissions
                    submissions: await db.getGameSubmissions(game_info.id),
                };

                // console.log(this.game);
                await Promise.all(
                    this.game.submissions.map(({ image, version }) =>
                        // TODO: authconfig should be created for private registry
                        this.docker.pull(`${image}:${version}`, {} /*{ authconfig: { serveraddress: "http://registry:5000" } }*/),
                    ),
                ).catch((error) => { console.error(error); process.exit(1); });

                this.game.status = "in_progress";

                await Promise.all(
                    this.game.submissions.map(({ image, version, team: { name } }) =>
                        // TODO: file stream or stream to remote log needs to be made
                        // TODO: refactor to use game server url
                        this.docker.run(`${image}:${version}`,
                            ["-n", `${name}`, "-s", `docker.for.mac.localhost:${GAME_SERVER_GAME_PORT}`, "-r", `${this.game.id}`],
                            process.stdout),
                    ),
                ).catch((error) => { console.error(error); process.exit(1); });

                this.game.status = "ending";
                this.game.end_time = Date.now();
                // TODO: write local logs to remote log store
                this.game.submissions.forEach((sub) => {
                    sub.output_url = "";
                });

                await db.updateSubmissions(this.game).catch((error) => { console.error(error); process.exit(1); });

                await request.get(`${GAME_SERVER_URL}:${GAME_SERVER_API_PORT}/status/${"Saloon"}/${"1"}`).then(
                    (body) => {
                        const { clients, gamelogFilename }: IGameServerStatus = JSON.parse(body);
                        // console.log(clients);
                        const winner_index = _.findIndex(clients, ({ won }) => won);
                        const [winner, loser] = (winner_index === 0 ? clients : clients.reverse());
                        // console.log(winner);
                        this.game.winner = this.game.submissions.find(({ team: { name } }) => name === winner.name);
                        // console.log(this.game.winner);
                        this.game.win_reason = winner.reason;
                        this.game.lose_reason = loser.reason;
                        // TODO: append gameserver url
                        this.game.log_url = gamelogFilename;
                    }, ({ error, gameName }: IGameServerError) => {
                        throw new Error(`${error}\n\n${gameName}`);
                    },
                ).catch((error) => { console.error(error); process.exit(1); });

                await db.updateEndedGame(this.game).catch((error) => { console.error(error); process.exit(1); });
                this.game.status = "complete";
            }

            yield new Promise((res, rej) => {
                setTimeout(res, 500);
            });
        }
    }
}
