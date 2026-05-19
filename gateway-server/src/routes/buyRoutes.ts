import express from "express";
import authMiddleware from "../middleware/authMiddleware";
import { buyStock, createSip, getAllFunds, getAllStocks, getFundByScheme, getSips, getStockBySymbol, sellStock, stopSip } from "../controllers/buySellController";
const router = express.Router();
router.post(
    "/buy",
    authMiddleware,
    buyStock
);

router.post(
    "/sell",
    authMiddleware,
    sellStock
);

router.get(
    "/sips/:customerRef",
    authMiddleware,
    getSips
);

router.post(
    "/sip",
    authMiddleware,
    createSip
);

router.patch(
    "/sip/:id/stop",
    authMiddleware,
    stopSip
);

router.get(
    "/market/funds",
    authMiddleware,
    getAllFunds
);

router.get(
    "/market/funds/:schemeCode",
    authMiddleware,
    getFundByScheme
);

router.get(
    "/market/stocks",
    authMiddleware,
    getAllStocks
);

router.get(
    "/market/stocks/:stockSymbol",
    authMiddleware,
    getStockBySymbol
);

export default router;