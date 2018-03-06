import * as fs from "fs";
import { basename } from "path";
import { PassThrough } from "stream";
import * as zlib from "zlib";

import { IContainer } from "../Docker";
import { IGameSubmission } from "../Game";
import { GameServer } from "../GameServer";
import { CLIENT_CPU_PERIOD, CLIENT_CPU_QUOTA, CLIENT_MEMORY_LIMIT, CLIENT_NETWORK, CLIENT_USER, OUTPUT_DIR } from "../vars";

/**
 * Create a client is used to create a container from the client image
 *
 * @export
 * @param {IGameSubmission} { id: sub_id, image, output_url, team: { name, id: team_id } }
 * @param {GameServer} game_server
 * @param {number} game_id
 * @returns {IContainer}
 */
export function createClient(
    { id: sub_id, image, output_url, team: { name, id: team_id } }: IGameSubmission,
    game_server: GameServer,
    game_id: number,
): IContainer {
    if (output_url == null) { throw new Error("output_url was null"); }
    const client_log = fs.createWriteStream(`${OUTPUT_DIR}/${basename(output_url)}`);
    const compressor = zlib.createGzip();
    const log = new PassThrough();
    log.pipe(compressor).pipe(client_log);
    return {
        cmd: ["-n", `${name}`, "-s", game_server.game_url, "-r", `${game_id}`, game_server.options.game_name],
        createOptions: {
            HostConfig: {
                CpuPeriod: CLIENT_CPU_PERIOD, CpuQuota: CLIENT_CPU_QUOTA,
                Memory: CLIENT_MEMORY_LIMIT, MemorySwap: CLIENT_MEMORY_LIMIT, NetworkMode: CLIENT_NETWORK,
            },
            User: CLIENT_USER,
            name: `team_${team_id}_${sub_id}`,
        },
        image,
        outputStream: log,
    };
}
