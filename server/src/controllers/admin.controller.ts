import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { getAdminOverview } from "../features/admin/admin.overview.service.js";

export async function getAdminDashboardOverview(
  _request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const overview = await getAdminOverview();

    response.status(200).json({
      status: "success",
      code: "ADMIN_OVERVIEW_READY",
      overview: {
        ...overview,
        generatedAt: overview.generatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}