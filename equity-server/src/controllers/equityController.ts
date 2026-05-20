import { Request, Response } from "express";
import pool from "../config/db";

export const getStocks = async (req: Request, res: Response): Promise<void> => {
    try {
        const { investorId } = req.params;
        const investorQuery = `
            SELECT *
            FROM equity_users
            WHERE investor_id = $1
        `;
        const investorResult =
            await pool.query(
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
        const holdingsQuery = `
            SELECT *
            FROM equity_holdings
            WHERE investor_id = $1
        `;
        const holdingsResult =
            await pool.query(
                holdingsQuery,
                [investorId]
            );
        res.status(200).json({
            success: true,
            investor: investorResult.rows[0],
            holdings: holdingsResult.rows
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch holdings"
        });
    }
};

export const getTransactions = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const { investorId } =
            req.params;

        const investorQuery = `
            SELECT *
            FROM unified_investors
            WHERE investor_id = $1
        `;

        const investorResult =
            await pool.query(
                investorQuery,
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

        const transactionQuery = `
            SELECT
                et.id,
                et.stock_symbol,

                sm.company_name,

                et.transaction_type,
                et.quantity,
                et.price,
                et.realized_gain,
                et.executed_at

            FROM equity_transactions et

            JOIN stock_master sm
            ON et.stock_symbol = sm.stock_symbol

            WHERE et.investor_id = $1

            ORDER BY et.executed_at DESC
        `;

        const transactionResult =
            await pool.query(
                transactionQuery,
                [investorId]
            );

        res.status(200).json({
            success: true,

            investor: {
                investorId:
                    investor.investor_id,

                fullName:
                    investor.full_name,

                pan:
                    investor.pan_number
            },

            totalTransactions:
                transactionResult.rows.length,

            transactions:
                transactionResult.rows
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

export const buyStock = async (req: Request,res: Response): Promise<void> => {
    try {
        const {
            investorId,
            stockSymbol,
            quantity
        } = req.body;

        const investorQuery = `
            SELECT *
            FROM equity_users
            WHERE investor_id = $1
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

        const stockQuery = `
            SELECT
                sm.stock_symbol,
                sm.company_name,
                sm.exchange,
                sph.price

            FROM stock_master sm

            JOIN stock_price_history sph
            ON sm.stock_symbol = sph.stock_symbol

            WHERE sm.stock_symbol = $1

            ORDER BY sph.recorded_at DESC

            LIMIT 1
        `;

        const stockResult = await pool.query(
            stockQuery,
            [stockSymbol]
        );

        if (stockResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Stock not found"
            });

            return;
        }

        const stock =
            stockResult.rows[0];

        const currentPrice =
            Number(stock.price);

        const exchange =
            stock.exchange;

        const existingHoldingQuery = `
            SELECT *
            FROM equity_holdings
            WHERE investor_id = $1
            AND stock_symbol = $2
        `;

        const existingHoldingResult = await pool.query(
            existingHoldingQuery,
            [investorId, stockSymbol]
        );

        if (existingHoldingResult.rows.length > 0) {

            const holding =
                existingHoldingResult.rows[0];

            const oldQuantity =
                Number(holding.quantity);

            const oldAvgPrice =
                Number(holding.avg_buy_price);

            const newQuantity =
                oldQuantity + Number(quantity);

            const newAvgPrice =
                (
                    (oldQuantity * oldAvgPrice)
                    +
                    (Number(quantity) * currentPrice)
                ) / newQuantity;

            await pool.query(
                `
                UPDATE equity_holdings
                SET quantity = $1,
                    avg_buy_price = $2,
                    current_market_price = $3,
                    updated_at = NOW()
                WHERE id = $4
                `,
                [
                    newQuantity,
                    newAvgPrice,
                    currentPrice,
                    holding.id
                ]
            );

        } else {

            await pool.query(
                `
                INSERT INTO equity_holdings(
                    investor_id,
                    stock_symbol,
                    quantity,
                    avg_buy_price,
                    current_market_price,
                    exchange
                )
                VALUES($1,$2,$3,$4,$5,$6)
                `,
                [
                    investorId,
                    stockSymbol,
                    quantity,
                    currentPrice,
                    currentPrice,
                    exchange
                ]
            );
        }

        await pool.query(
            `
            INSERT INTO equity_transactions(
                investor_id,
                stock_symbol,
                transaction_type,
                quantity,
                price,
                realized_gain,
                executed_at
            )
            VALUES($1,$2,$3,$4,$5,$6,NOW())
            `,
            [
                investorId,
                stockSymbol,
                "BUY",
                quantity,
                currentPrice,
                0
            ]
        );

        res.status(201).json({
            success: true,
            stockSymbol,
            quantity,
            executedPrice: currentPrice,
            message: "Stock purchased successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Stock purchase failed"
        });
    }
};

export const sellStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { investorId,
            stockSymbol,
            quantity
        } = req.body;
        const holdingQuery = `
            SELECT *
            FROM equity_holdings
            WHERE investor_id = $1
            AND stock_symbol = $2
        `;

        const holdingResult = await pool.query(
            holdingQuery,
            [investorId, stockSymbol]
        );

        if (holdingResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Holding not found"
            });

            return;
        }

        const holding =
            holdingResult.rows[0];

        if (
            Number(quantity) >
            Number(holding.quantity)
        ) {

            res.status(400).json({
                success: false,
                message: "Insufficient quantity"
            });

            return;
        }

        const stockQuery = `
            SELECT
                price
            FROM stock_price_history
            WHERE stock_symbol = $1
            ORDER BY recorded_at DESC
            LIMIT 1
        `;

        const stockResult = await pool.query(
            stockQuery,
            [stockSymbol]
        );

        if (stockResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Stock price not found"
            });

            return;
        }

        const currentPrice =
            Number(stockResult.rows[0].price);

        const remainingQuantity =
            Number(holding.quantity) -
            Number(quantity);

        const realizedGain =
            (
                currentPrice -
                Number(holding.avg_buy_price)
            ) * Number(quantity);

        if (remainingQuantity === 0) {

            await pool.query(
                `
                DELETE FROM equity_holdings
                WHERE id = $1
                `,
                [holding.id]
            );

        } else {

            await pool.query(
                `
                UPDATE equity_holdings
                SET quantity = $1,
                    current_market_price = $2,
                    updated_at = NOW()
                WHERE id = $3
                `,
                [
                    remainingQuantity,
                    currentPrice,
                    holding.id
                ]
            );
        }

        await pool.query(
            `
            INSERT INTO equity_transactions(
                investor_id,
                stock_symbol,
                transaction_type,
                quantity,
                price,
                realized_gain,
                executed_at
            )
            VALUES($1,$2,$3,$4,$5,$6,NOW())
            `,
            [
                investorId,
                stockSymbol,
                "SELL",
                quantity,
                currentPrice,
                realizedGain
            ]
        );

        res.status(200).json({
            success: true,
            stockSymbol,
            quantity,
            executedPrice: currentPrice,
            realizedGain,
            message: "Stock sold successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Stock sell failed"
        });
    }
};

export const getStockHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { stockSymbol } = req.params;

        const historyQuery = `
            SELECT
                price,
                recorded_at
            FROM stock_price_history
            WHERE stock_symbol = $1
            ORDER BY recorded_at ASC
        `;

        const historyResult = await pool.query(
            historyQuery,
            [stockSymbol]
        );

        res.status(200).json({
            success: true,
            stockSymbol,
            history: historyResult.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch stock history"
        });
    }
};

export const getAllStocks = async (req: Request,res: Response): Promise<void> => {
    try {
        const stockQuery = `
            SELECT
                sm.stock_symbol,
                sm.company_name,
                sm.exchange,
                sm.sector,

                sph.price,
                sph.recorded_at

            FROM stock_master sm

            JOIN (
                SELECT DISTINCT ON (stock_symbol)
                    stock_symbol,
                    price,
                    recorded_at
                FROM stock_price_history
                ORDER BY stock_symbol, recorded_at DESC
            ) sph

            ON sm.stock_symbol = sph.stock_symbol

            ORDER BY sm.company_name ASC
        `;

        const stockResult =
            await pool.query(stockQuery);

        res.status(200).json({
            success: true,
            totalStocks:
                stockResult.rows.length,
            stocks:
                stockResult.rows
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch stocks"
        });
    }
};

export const getStockBySymbol = async (req: Request,res: Response): Promise<void> => {
    try {
        const { stockSymbol } =
            req.params;
        const stockQuery = `
            SELECT
                sm.*,

                sph.price,
                sph.recorded_at

            FROM stock_master sm

            JOIN (
                SELECT DISTINCT ON (stock_symbol)
                    stock_symbol,
                    price,
                    recorded_at
                FROM stock_price_history
                ORDER BY stock_symbol, recorded_at DESC
            ) sph

            ON sm.stock_symbol = sph.stock_symbol

            WHERE sm.stock_symbol = $1
        `;

        const stockResult =
            await pool.query(
                stockQuery,
                [stockSymbol]
            );

        if (
            stockResult.rows.length === 0
        ) {

            res.status(404).json({
                success: false,
                message:
                    "Stock not found"
            });

            return;
        }

        res.status(200).json({
            success: true,
            stock:
                stockResult.rows[0]
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch stock"
        });
    }
};

export const getAllTransactions = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const transactionQuery = `
            SELECT
                et.id,
                et.investor_id,

                eu.full_name,

                et.stock_symbol,

                sm.company_name,

                et.transaction_type,
                et.quantity,
                et.price,
                et.realized_gain,
                et.executed_at

            FROM equity_transactions et

            JOIN equity_users eu
            ON et.investor_id = eu.investor_id

            JOIN stock_master sm
            ON et.stock_symbol = sm.stock_symbol

            ORDER BY et.executed_at DESC
        `;

        const transactionResult =
            await pool.query(
                transactionQuery
            );

        res.status(200).json({
            success: true,

            totalTransactions:
                transactionResult.rows.length,

            transactions:
                transactionResult.rows
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