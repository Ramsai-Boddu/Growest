import express from "express";

import {buyStock, getAllStocks, getAllTransactions, getStockBySymbol, getStockHistory, getStocks, getTransactions, sellStock} from "../controllers/equityController";

const router = express.Router();

router.get("/stocks/:investorId",getStocks);
router.get("/transactions/:investorId",getTransactions);
router.post("/buy",buyStock);
router.post("/sell",sellStock);
router.get("/stock-history/:stockSymbol",getStockHistory);
router.get("/market/stocks",getAllStocks);
router.get("/market/stocks/:stockSymbol",getStockBySymbol);
router.get(
    "/transactions",
    getAllTransactions
);

export default router;