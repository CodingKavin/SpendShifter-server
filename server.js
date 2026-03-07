import "dotenv/config";
import cors from "cors";
import express from "express";
import expenses from "./routes/expenses.js";
import budgets from "./routes/budgets.js";

const port = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL;
const app = express();

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json()); // allows parsing JSON data from req objects

app.use("/expenses", expenses);
app.use("/budgets", budgets);

app.listen(port, () => console.log(`Listening on ${port}`));
