import express from "express";
import {getAllTransactions, getInvestorDetails, getPortfolio} from "../controllers/portfolioController";
import authMiddleware from "../middleware/authMiddleware";
import roleMiddleware from "../middleware/roleMiddleware";
import rateLimiter from "../middleware/rateLimiter";

const router = express.Router();

router.get("/:investorId",authMiddleware,
    roleMiddleware([
        "ADMIN",
        "ANALYST",
        "INVESTOR"
    ]),rateLimiter,
    getPortfolio);

router.get(
    "/investor/:investorId",
    authMiddleware,
    getInvestorDetails
);

router.get(
    "/transactions/:investorId",
    authMiddleware,
    getAllTransactions
);


export default router;