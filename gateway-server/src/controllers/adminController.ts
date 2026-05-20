import axios from "axios";
import pool from "../config/db";
import { Request, Response } from "express";

export const getAllInvestors = async (req: Request,res: Response): Promise<void> => {
    try {
        const investorQuery = `
            SELECT
                ui.id,
                ui.investor_id,
                ui.customer_ref,
                ui.full_name,
                ui.email,
                ui.mobile,
                ui.pan_number,
                ui.created_at,

                eu.demat_account,

                mc.folio_number

            FROM unified_investors ui

            LEFT JOIN equity_users eu
            ON ui.investor_id = eu.investor_id

            LEFT JOIN mf_customers mc
            ON ui.customer_ref = mc.customer_ref

            ORDER BY ui.created_at DESC
        `;

        const investorResult =
            await pool.query(
                investorQuery
            );

        res.status(200).json({
            success: true,
            totalInvestors:
                investorResult.rows.length,
            investors:
                investorResult.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch investors"
        });
    }
};

export const toggleInvestorStatus = async (req: Request,res: Response): Promise<void> => {
    try {
        const { investorId } =req.params;
        const investorResult =
            await pool.query(
                `
                SELECT *
                FROM unified_investors
                WHERE investor_id = $1
                `,
                [investorId]
            );

        if (investorResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message:
                    "Investor not found"
            });
            return;
        }

        const investor =investorResult.rows[0];
        const updatedStatus =!investor.is_active;
        await pool.query(
            `
            UPDATE unified_investors
            SET is_active = $1
            WHERE investor_id = $2
            `,
            [
                updatedStatus,
                investorId
            ]
        );

        res.status(200).json({
            success: true,
            investorId,
            isActive: updatedStatus,
            message:
                updatedStatus
                    ? "Investor activated successfully"
                    : "Investor deactivated successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to update investor status"
        });
    }
};

export const getAllLogs = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const logsQuery = `
            SELECT
                id,
                investor_pan,
                service_name,
                action,
                endpoint,
                request_method,
                ip_address,
                status_code,
                response_time_ms,
                success,
                created_at

            FROM audit_logs

            ORDER BY created_at DESC
        `;

        const logsResult =
            await pool.query(
                logsQuery
            );

        res.status(200).json({
            success: true,

            totalLogs:
                logsResult.rows.length,

            logs:
                logsResult.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch logs"
        });
    }
};

export const updateStockPrice = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const {
            stockSymbol,
            price
        } = req.body;

        const stockResult =
            await pool.query(
                `
                SELECT *
                FROM stock_master
                WHERE stock_symbol = $1
                `,
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

        await pool.query(
            `
            INSERT INTO stock_price_history(
                stock_symbol,
                price,
                recorded_at
            )
            VALUES($1,$2,NOW())
            `,
            [
                stockSymbol,
                price
            ]
        );

        await pool.query(
            `
            UPDATE equity_holdings
            SET current_market_price = $1,
                updated_at = NOW()
            WHERE stock_symbol = $2
            `,
            [
                price,
                stockSymbol
            ]
        );

        res.status(200).json({
            success: true,
            stockSymbol,
            updatedPrice: price,
            message:
                "Stock price updated successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to update stock price"
        });
    }
};

export const updateFundNav = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const {
            schemeCode,
            navValue
        } = req.body;

        const schemeResult =
            await pool.query(
                `
                SELECT *
                FROM mf_schemes
                WHERE scheme_code = $1
                `,
                [schemeCode]
            );

        if (
            schemeResult.rows.length === 0
        ) {

            res.status(404).json({
                success: false,
                message:
                    "Scheme not found"
            });

            return;
        }

        await pool.query(
            `
            INSERT INTO mf_nav_history(
                scheme_code,
                nav_value,
                nav_date
            )
            VALUES($1,$2,CURRENT_DATE)
            `,
            [
                schemeCode,
                navValue
            ]
        );

        await pool.query(
            `
            UPDATE mf_customer_funds
            SET current_value =
                units * $1
            WHERE scheme_code = $2
            `,
            [
                navValue,
                schemeCode
            ]
        );

        res.status(200).json({
            success: true,
            schemeCode,
            updatedNav: navValue,
            message:
                "Fund NAV updated successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to update NAV"
        });
    }
};

export const addInvestor = async (
    req: Request,
    res: Response
): Promise<void> => {

    const client =
        await pool.connect();

    try {

        await client.query(
            "BEGIN"
        );

        const {
            investorId,
            customerRef,
            fullName,
            email,
            mobile,
            panNumber,
            dematAccount,
            folioNumber,
            password,
            role
        } = req.body;

        const existingInvestor =
            await client.query(
                `
                SELECT *
                FROM unified_investors
                WHERE investor_id = $1
                OR pan_number = $2
                `,
                [
                    investorId,
                    panNumber
                ]
            );

        if (
            existingInvestor.rows.length > 0
        ) {

            const existing =
                existingInvestor.rows[0];

            await client.query(
                "ROLLBACK"
            );

            res.status(400).json({
                success: false,
                message:
                    "Investor already exists",

                existingInvestor: {
                    investorId:
                        existing.investor_id,

                    panNumber:
                        existing.pan_number
                }
            });

            return;
        }

        const existingEmail =
            await client.query(
                `
                SELECT *
                FROM equity_users
                WHERE email = $1
                `,
                [email]
            );

        if (
            existingEmail.rows.length > 0
        ) {

            await client.query(
                "ROLLBACK"
            );

            res.status(400).json({
                success: false,
                message:
                    "Email already exists"
            });

            return;
        }

        await client.query(
            `
            INSERT INTO equity_users(
                investor_id,
                full_name,
                email,
                pan_number,
                demat_account,
                password_hash
            )
            VALUES($1,$2,$3,$4,$5,$6)
            `,
            [
                investorId,
                fullName,
                email,
                panNumber,
                dematAccount,
                password
            ]
        );

        await client.query(
            `
            INSERT INTO mf_customers(
                customer_ref,
                full_name,
                email,
                pan_number,
                folio_number
            )
            VALUES($1,$2,$3,$4,$5)
            `,
            [
                customerRef,
                fullName,
                email,
                panNumber,
                folioNumber
            ]
        );

        const unifiedResult =
            await client.query(
                `
                INSERT INTO unified_investors(
                    investor_id,
                    customer_ref,
                    full_name,
                    email,
                    mobile,
                    pan_number,
                    is_active
                )
                VALUES($1,$2,$3,$4,$5,$6,$7)
                RETURNING *
                `,
                [
                    investorId,
                    customerRef,
                    fullName,
                    email,
                    mobile,
                    panNumber,
                    true
                ]
            );

        const unifiedInvestor =
            unifiedResult.rows[0];

        const roleResult =
            await client.query(
                `
                SELECT id
                FROM roles
                WHERE role_name = $1
                `,
                [
                    role || "INVESTOR"
                ]
            );

        const roleId =
            roleResult.rows[0].id;

        await client.query(
            `
            INSERT INTO user_roles(
                investor_pan,
                role_id
            )
            VALUES($1,$2)
            `,
            [
                panNumber,
                roleId
            ]
        );

        await client.query(
            `
            INSERT INTO unified_equity_mapping(
                unified_investor_id,
                investor_id
            )
            VALUES($1,$2)
            `,
            [
                unifiedInvestor.id,
                investorId
            ]
        );

        await client.query(
            `
            INSERT INTO unified_mf_mapping(
                unified_investor_id,
                customer_ref
            )
            VALUES($1,$2)
            `,
            [
                unifiedInvestor.id,
                customerRef
            ]
        );

        await client.query(
            "COMMIT"
        );

        res.status(201).json({
            success: true,
            investor: unifiedInvestor,
            message:
                "Investor added successfully"
        });

    } catch (error) {

        await client.query(
            "ROLLBACK"
        );

        console.log(error);

        res.status(500).json({
            success: false,
            message:
                "Failed to add investor"
        });

    } finally {

        client.release();
    }
};

export const getAllPortfolioTransactions = async (
    req: Request,
    res: Response
): Promise<void> => {

    try {

        const stockResponse =
            await axios.get(
                "http://localhost:4001/equity/transactions"
            );

        const mfResponse =
            await axios.get(
                "http://localhost:4002/mf/transactions"
            );

        res.status(200).json({
            success: true,

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