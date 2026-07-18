import { Router } from "express";
import { getTvCollectionPage } from "../controllers/tvCollections.controller.js";

const router = Router();

router.get("/collections/tv", getTvCollectionPage);

export default router;
