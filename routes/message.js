import express from "express";
import { createMessage, getMessages } from "../controllers/message.js";
import isAuthenticated from '../middlewares/isAuthenticated.js'
const messageRouter = express.Router();

messageRouter.post("/", createMessage);
messageRouter.get("/",isAuthenticated, getMessages);

export default messageRouter;
