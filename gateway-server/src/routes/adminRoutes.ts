import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import roleMiddleware from "../middleware/roleMiddleware";
import { addInvestor, createFund, createStock, getAllInvestors, getAllLogs, getAllPortfolioTransactions, toggleInvestorStatus, updateFundNav, updateStockPrice } from "../controllers/adminController";
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

router.get(
    "/transactions",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    getAllPortfolioTransactions
);

router.post(
    "/market/stocks",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    createStock
);

router.post(
    "/market/funds",
    authMiddleware,
    roleMiddleware(["ADMIN"]),
    createFund
);

export default router;