import express, { Application, Request, Response } from "express";
import { requestLogger } from "./middleware/request_logger";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";
import siteRouter from "./routers/site_router";
import diveRouter from "./routers/dive_router";

export const app: Application = express();

app.use(requestLogger);
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/logbook/sites", siteRouter);
app.use("/logbook/dives", diveRouter);

app.get("/ping", (_req: Request, res: Response) => {
    res.json({ message: "Dive logbook API is running" });
}); 