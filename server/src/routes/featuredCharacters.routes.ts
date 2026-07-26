import { Router } from "express";
import { getMediaFeaturedCharacters } from "../controllers/featuredCharacters.controller.js";

const router = Router();

router.get(
  "/media/:mediaType/:tmdbId/featured-characters",
  getMediaFeaturedCharacters,
);

export default router;