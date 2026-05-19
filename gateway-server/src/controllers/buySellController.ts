import { Request, Response } from "express";
import axios from "axios";

export const buyStock = async (req: Request,res: Response): Promise<void> => {
    try {
        const response = await axios.post(
            "http://localhost:4001/equity/buy",
            req.body
        );
        res.status(201).json(
            response.data
        );
    } catch (error: any) {
        console.log(error.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Failed to buy stock"
        });
    }
};

export const sellStock = async (req: Request,res: Response): Promise<void> => {
    try {
        const response = await axios.post(
            "http://localhost:4001/equity/sell",
            req.body
        );
        res.status(200).json(
            response.data
        );
    } catch (error: any) {
        console.log(error.response?.data || error);
        res.status(500).json({
            success: false,
            message: "Failed to sell stock"
        });
    }
};

export const createSip = async (req: Request,res: Response): Promise<void> => {
    try {
        const response = await axios.post(
            "http://localhost:4002/mf/sip",
            req.body
        );
        res.status(201).json(
            response.data
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to create SIP"
        });
    }
};

export const stopSip = async (req: Request,res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const response = await axios.patch(
            `http://localhost:4002/mf/sip/${id}/stop`
        );
        res.status(200).json(
            response.data
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to stop SIP"
        });
    }
};

export const getSips = async (req: Request,res: Response): Promise<void> => {
    try {
        const { customerRef } = req.params;
        const response = await axios.get(
            `http://localhost:4002/mf/sips/${customerRef}`
        );
        res.status(200).json(
            response.data
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch SIPs"
        });
    }
};

export const getAllFunds = async (req: Request,res: Response): Promise<void> => {
    try {
        const response = await axios.get(
            "http://localhost:4002/mf/market/funds"
        );
        res.status(200).json(
            response.data
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch funds"
        });
    }
};

export const getFundByScheme = async (req: Request,res: Response): Promise<void> => {
    try {
        const { schemeCode } = req.params;
        const response = await axios.get(
            `http://localhost:4002/mf/market/funds/${schemeCode}`
        );
        res.status(200).json(
            response.data
        );
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch fund"
        });
    }
};

export const getAllStocks = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const response =
            await axios.get(
                "http://localhost:4001/equity/market/stocks"
            );

        res.status(200).json(
            response.data
        );

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch stocks"
        });
    }
};

export const getStockBySymbol = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { stockSymbol } =
            req.params;

        const response =
            await axios.get(
                `http://localhost:4001/equity/market/stocks/${stockSymbol}`
            );

        res.status(200).json(
            response.data
        );

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch stock"
        });
    }
};