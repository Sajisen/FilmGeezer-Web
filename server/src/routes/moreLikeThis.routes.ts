import { Router } from "express";
import { getMoreLikeThisByTmdbId } from "../controllers/moreLikeThis.controller.js";

const router = Router();

router.get(
  "/media/:mediaType/:tmdbId/more-like-this",
  getMoreLikeThisByTmdbId,
);

export default router;
