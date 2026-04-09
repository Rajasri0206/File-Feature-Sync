import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import sessionsRouter from "./sessions";
import feedbackRouter from "./feedback";
import ttsRouter from "./tts";
import progressRouter from "./progress";
import gamificationRouter from "./gamification";
import topicsRouter from "./topics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(sessionsRouter);
router.use(feedbackRouter);
router.use(ttsRouter);
router.use(progressRouter);
router.use(gamificationRouter);
router.use(topicsRouter);

export default router;
