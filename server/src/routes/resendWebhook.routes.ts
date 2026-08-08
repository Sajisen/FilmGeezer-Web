import express from "express";

import { receiveResendWebhook } from "../controllers/resendWebhook.controller.js";

const router = express.Router();

router.post(
  "/",
  express.text({
    type: "application/json",
    limit: "64kb",
  }),
  receiveResendWebhook,
);

export default router;
