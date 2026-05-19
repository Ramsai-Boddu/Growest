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