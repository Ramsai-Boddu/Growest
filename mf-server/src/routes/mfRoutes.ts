import express from "express";
import {createSip, getAllFunds, getAllMfTransactions, getFundByScheme, getFunds,getMfTransactions,getNavHistory,getSipHistory, getSipsById, investFund, stopSip} from "../controllers/mfController";

const router = express.Router();

router.get("/funds/:customerRef",getFunds);
router.get("/sips/:customerRef",getSipsById);
router.post("/invest",investFund);
router.post("/sip",createSip);
router.patch("/sip/:id/stop",stopSip);
router.get("/nav-history/:schemeCode",getNavHistory);
router.get("/sip-history/:customerRef",getSipHistory);
router.get("/market/funds",getAllFunds);
router.get("/market/funds/:schemeCode",getFundByScheme);
router.get(
    "/transactions/:investorId",
    getMfTransactions
);
router.get(
    "/transactions",
    getAllMfTransactions
);

export default router;