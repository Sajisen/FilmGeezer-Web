import { Router } from "express";
import { getAnimeCollectionPage } from "../controllers/animeCollections.controller.js";

const router = Router();

router.get("/collections/anime", getAnimeCollectionPage);

export default router;
