import * as dotenv from "dotenv";
dotenv.config();

import * as _ from "lodash";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as cors from "cors";
import * as httpErrors from "http-errors";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get("/status", (req, res) => {
    res.send(JSON.stringify({starting: [], in_progress: [], ending: []}))
})