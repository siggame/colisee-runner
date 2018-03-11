import { PassThrough } from "stream";

export interface IContainerCreateOptions {
    HostConfig: {
        AutoRemove: boolean;
        CpuPeriod: number; /* TODO: Investigate exactly how useful these are */
        CpuQuota: number;
        ExtraHosts?: string[];
        Memory: number;
        MemorySwap: number;
        NetworkMode: string;
    };
    name: string;
    StopTimeout: number;
    User: string;
}

export interface IContainer {
    cmd: string[];
    createOptions: IContainerCreateOptions;
    id?: string;
    image: string;
    outputStream: PassThrough;
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
