import { Request, Response } from "express";
import axios from "axios";
import pool from "../config/db";
import redisClient from "../config/redis";

export const getPortfolio = async (req: Request, res: Response): Promise<void> => {
    try {
        const { investorId } = req.params;

        const investorQuery = `
            SELECT *
            FROM unified_investors
            WHERE investor_id = $1
        `;

        const investorResult = await pool.query(investorQuery, [investorId]);

        if (investorResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Investor not found"
            });
            return;
        }

        const investor = investorResult.rows[0];

        if (req.user?.role !== "ADMIN" && req.user?.investorId !== investorId) {
            res.status(403).json({
                success: false,
                message: "Unauthorized portfolio access"
            });
            return;
        }

        const cacheKey = `portfolio:${investorId}`;

        let cachedPortfolio = null;

        if (redisClient.isOpen) {
            cachedPortfolio = await redisClient.get(cacheKey);
        }

        if (cachedPortfolio) {
            res.status(200).json({
                success: true,
                source: "REDIS_CACHE",
                data: JSON.parse(cachedPortfolio)
            });
            return;
        }

        const customerRef = investor.customer_ref;

        const equityResponse = await axios.get(
            `http://localhost:4001/equity/stocks/${investorId}`
        );

        const mfResponse = await axios.get(
            `http://localhost:4002/mf/funds/${customerRef}`
        );

        const holdings = equityResponse.data.holdings;
        const funds = mfResponse.data.funds;

        const totalEquity = holdings.reduce(
            (total: number, stock: any) => {
                return total + (
                    Number(stock.quantity) *
                    Number(stock.current_market_price)
                );
            },
            0
        );

        const totalMutualFunds = funds.reduce(
            (total: number, fund: any) => {
                return total + Number(fund.current_value);
            },
            0
        );

        const totalNetworth = totalEquity + totalMutualFunds;

        const portfolioResponse = {
            investor: {
                investorId: investor.investor_id,
                customerRef: investor.customer_ref,
                fullName: investor.full_name,
                pan: investor.pan_number
            },
            equity: {
                totalValue: totalEquity,
                holdings
            },
            mutualFunds: {
                totalValue: totalMutualFunds,
                funds
            },
            summary: {
                totalEquity,
                totalMutualFunds,
                totalNetworth
            }
        };

        if (redisClient.isOpen) {
            await redisClient.set(
                cacheKey,
                JSON.stringify(portfolioResponse),
                { EX: 60 }
            );
        }

        res.status(200).json({
            success: true,
            source: "DATABASE",
            data: portfolioResponse
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to aggregate portfolio"
        });
    }
};

export const getInvestorDetails = async (req: Request,res: Response): Promise<void> => {
    try {
        const { investorId } = req.params;
        const investorQuery = `
            SELECT
                ui.id,
                ui.investor_id,
                ui.customer_ref,
                ui.full_name,
                ui.email,
                ui.mobile,
                ui.pan_number,

                eu.demat_account,

                mc.folio_number

            FROM unified_investors ui

            LEFT JOIN equity_users eu
            ON ui.investor_id = eu.investor_id

            LEFT JOIN mf_customers mc
            ON ui.customer_ref = mc.customer_ref

            WHERE ui.investor_id = $1
        `;

        const investorResult = await pool.query(
            investorQuery,
            [investorId]
        );

        if (investorResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Investor not found"
            });

            return;
        }

        const investor =
            investorResult.rows[0];

        res.status(200).json({
            success: true,
            investor
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch investor details"
        });
    }
};

export const getAllTransactions = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { investorId } =
            req.params;

        const investorResult =
            await pool.query(
                `
                SELECT *
                FROM unified_investors
                WHERE investor_id = $1
                `,
                [investorId]
            );

        if (
            investorResult.rows.length === 0
        ) {

            res.status(404).json({
                success: false,
                message:
                    "Investor not found"
            });

            return;
        }

        const investor =
            investorResult.rows[0];

        const customerRef =
            investor.customer_ref;

        const stockResponse =
            await axios.get(
                `http://localhost:4001/equity/transactions/${investorId}`
            );

        const mfResponse =
            await axios.get(
                `http://localhost:4002/mf/transactions/${customerRef}`
            );

        res.status(200).json({
            success: true,

            investor: {
                investorId:
                    investor.investor_id,

                customerRef:
                    investor.customer_ref,

                fullName:
                    investor.full_name
            },

            stockTransactions:
                stockResponse.data.transactions,

            mfTransactions:
                mfResponse.data.transactions
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch transactions"
        });
    }
};