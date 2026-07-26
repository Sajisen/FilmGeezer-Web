import { Router } from "express";
import { getTvSeasonDetails } from "../controllers/seasonDetails.controller.js";

const router = Router();

router.get(
  "/media/tv/:tmdbId/seasons/:seasonNumber",
  getTvSeasonDetails,
);

export default router;