import { Match } from "./match";

export interface Runner {
    starting: Array<Match>;
    in_progress: Array<Match>;
    ending: Array<Match>;
    subscribe: () => boolean;
}