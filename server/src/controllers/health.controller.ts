import type {
  Request,
  Response,
} from "express";

export function getHealth(
  _request: Request,
  response: Response,
): void {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  response.status(200).json({
    status: "ok",
    message: "FilmGeezer API is ready",
  });
}