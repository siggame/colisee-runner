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
