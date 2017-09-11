import { app, listener } from "./app";
import { PORT } from "./vars";

export default () => {
    app.listen(PORT, listener);
};
