import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import roleMiddleware from "../middleware/roleMiddleware";
import { getAllInvestors, getAllLogs, toggleInvestorStatus } from "../controllers/adminController";
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

export default router;