import { Router } from "express";
import { store } from "../store.js";

export const groupRouter = Router();

groupRouter.get("/", (req, res) => {
  res.json({ group: store.group, people: store.listPeople() });
});
