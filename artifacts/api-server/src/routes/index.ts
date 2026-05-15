import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import messagesRouter from "./messages";
import reactionsRouter from "./reactions";
import usersRouter from "./users";
import bansRouter from "./bans";
import mutesRouter from "./mutes";
import appealsRouter from "./appeals";
import announcementsRouter from "./announcements";
import moderationLogsRouter from "./moderation-logs";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(messagesRouter);
router.use(reactionsRouter);
router.use(usersRouter);
router.use(bansRouter);
router.use(mutesRouter);
router.use(appealsRouter);
router.use(announcementsRouter);
router.use(moderationLogsRouter);
router.use(adminRouter);

export default router;
