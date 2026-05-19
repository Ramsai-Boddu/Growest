import express from "express";
import { getSipNavHistory, getStockHistory } from "../controllers/navController";
import authMiddleware from "../middleware/authMiddleware";
const router = express.Router();

router.get(
    "/nav-history/:schemeCode",
    authMiddleware,
    getSipNavHistory
);

router.get(
    "/stock-history/:stockSymbol",
    authMiddleware,
    getStockHistory
);

export default router;