import * as Docker from "dockerode";
import * as fs from "fs";
import { basename } from "path";
import { PassThrough, Readable } from "stream";
import * as winston from "winston";
import * as zlib from "zlib";

import { IContainer, IListContainerFilter } from "../Docker";
import { IGameSubmission } from "../Game";
import { GameServer } from "../GameServer";
import { timeout } from "../helpers";
import { CLIENT_CPU_PERIOD, CLIENT_CPU_QUOTA, CLIENT_MEMORY_LIMIT, CLIENT_NETWORK, CLIENT_USER, OUTPUT_DIR } from "../vars";

export class Client {
    private container: IContainer;
    private docker: Docker;

    constructor(
        { id: sub_id, image, output_url, team: { name, id: team_id } }: IGameSubmission,
        game_server: GameServer,
        game_id: number,
        docker_options: Docker.DockerOptions,
    ) {
        if (output_url == null) { throw new Error("output_url was null"); }
        this.container = {
            cmd: ["-n", `${name}`, "-s", game_server.game_url, "-r", `${game_id}`, game_server.options.game_name],
            createOptions: {
                HostConfig: {
                    AutoRemove: true, CpuPeriod: CLIENT_CPU_PERIOD, CpuQuota: CLIENT_CPU_QUOTA,
                    Memory: CLIENT_MEMORY_LIMIT, MemorySwap: CLIENT_MEMORY_LIMIT, NetworkMode: CLIENT_NETWORK,
                },
                StopTimeout: 0,
                User: CLIENT_USER,
                name: `team_${team_id}_${sub_id}`,
            },
            image,
            outputStream: zlib.createGzip().pipe(fs.createWriteStream(`${OUTPUT_DIR}/${basename(output_url)}`)),
        };
        this.docker = new Docker(docker_options);
    }

    public async pull() {
        try {
            const pull_output: Readable = await this.docker.pull(this.container.image, {/* TODO: needed for auth stuff in future */ });
            pull_output.pipe(this.container.outputStream, { end: false });
            await new Promise<void>((res, rej) => {
                pull_output.on("end", res);
                pull_output.on("error", rej);
            });
        } catch (error) {
            this.container.outputStream.write(`\n\n<<<<<<FAILED PULL>>>>>>\n\n${JSON.stringify(error)}`);
            this.container.outputStream.end();
            throw error;
        }
    }

    public async run(client_timeout: number) {
        if (client_timeout <= 0) { throw new Error(`timeout must be non-zero positive integer (given ${client_timeout})`); }
        // workaround for docker library closing outputStream when run finishes
        const log = new PassThrough();
        log.pipe(this.container.outputStream, { end: false });
        try {
            // attempt to run game, just interested in the promise resolving not it's value
            const attempt_run = this.docker.run(
                this.container.image,
                this.container.cmd,
                log,
                this.container.createOptions,
                this.container.startOptions,
            ).then(_ => true);
            // timeout for well-behaved but slow clients
            const on_time = await timeout(client_timeout * 60 * 1000, attempt_run);
            if (!on_time) {
                winston.info(`client ${this.container.createOptions.name} timed out`);
                try { await this.stop(); } catch (_) { /* ignore errors */ }
                this.container.outputStream.write("\n\n<<<<<<KILLED>>>>>>\n\nreached timeout");
            }
            this.container.outputStream.end();
        } catch (error) {
            this.container.outputStream.write(`\n\n<<<<<<FAILED RUN>>>>>>\n\n${JSON.stringify(error)}`);
            this.container.outputStream.end();
            winston.error(`client ${this.container.createOptions.name} failed to run`);
            throw error;
        }
    }

    public async inspect_container() {
        try {
            // must add '/' prefix to container name to compare with result returned by docker api
            const filter_by_name: IListContainerFilter = { name: [`/${this.container.createOptions.name}`] };
            const [client_container] = await this.docker.listContainers({ all: true, filters: filter_by_name });
            if (client_container) {
                this.container.id = client_container.Id;
                return await this.docker.getContainer(client_container.Id).inspect();
            }
        } catch (error) {
            winston.error(`unable to inspect ${this.container.createOptions.name}`);
            throw error;
        }
    }

    public async stop() {
        try {
            const client_info = await this.inspect_container();
            if (client_info) {
                await this.docker.getContainer(client_info.Id).stop();
            }
        } catch (error) {
            winston.error(`client ${this.container.createOptions.name} failed to stop`);
            throw error;
        }
    }
}
