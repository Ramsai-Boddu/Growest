import { Request, Response } from "express";
import axios from "axios";
import pool from "../config/db";
import redisClient from "../config/redis";

export const getSipNavHistory = async (req: Request,res: Response): Promise<void> => {
    try {
        const { schemeCode } = req.params;
        const response = await axios.get(
            `http://localhost:4002/mf/nav-history/${schemeCode}`
        );
        res.status(200).json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch NAV history"
        });
    }
};

export const getStockHistory = async (req: Request,res: Response): Promise<void> => {
    try {
        const { stockSymbol } = req.params;
        const response = await axios.get(
            `http://localhost:4001/equity/stock-history/${stockSymbol}`
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock history"
        });
    }
};

