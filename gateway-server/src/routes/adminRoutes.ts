import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import roleMiddleware from "../middleware/roleMiddleware";
import { addInvestor, getAllInvestors, getAllLogs, toggleInvestorStatus, updateFundNav, updateStockPrice } from "../controllers/adminController";
const router = express.Router();

router.get(
    "/investors",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    getAllInvestors
);

router.patch(
    "/investor/:investorId/deactivate",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    toggleInvestorStatus
);

router.get(
    "/logs",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    getAllLogs
);

router.post(
    "/market/stocks/update-price",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    updateStockPrice
);

router.post(
    "/market/funds/update-nav",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    updateFundNav
);

router.post(
    "/addinvestor",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    addInvestor
);

export default router;