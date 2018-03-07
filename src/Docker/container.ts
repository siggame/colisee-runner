import { PassThrough } from "stream";

export interface IContainer {
    image: string;
    cmd: string[];
    outputStream: PassThrough;
    createOptions: {
        HostConfig: {
            CpuPeriod: number; /* TODO: Investigate exactly how useful these are */
            CpuQuota: number;
            ExtraHosts?: string[];
            Memory: number;
            MemorySwap: number;
            NetworkMode: string;
        };
        name: string;
        User: string;
    };
    startOptions?: {};
}

type ContainerStatus = "created" | "dead" | "exited" | "paused" | "removing" | "restarting" | "running";

// https://docs.docker.com/engine/api/v1.36/#operation/ContainerList
export interface IListContainerFilter {
    ancestor?: string[];
    before?: string[];
    exited?: string[];
    expose?: string[];
    health?: string[];
    id?: string[];
    isolation?: string[];
    "is-task"?: boolean;
    label?: string;
    name?: string[];
    publish?: string[];
    since?: string[];
    status?: ContainerStatus | ContainerStatus[];
    volumes?: string[];
}
