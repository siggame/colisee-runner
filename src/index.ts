import { app, default as runner } from "./app";

if (!module.parent) {
    runner();
}

export { app };
