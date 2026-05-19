import { Request, Response } from "express";
import pool from "../config/db";

export const getFunds = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerRef } = req.params;

        const customerQuery = `
            SELECT *
            FROM mf_customers
            WHERE customer_ref = $1
        `;

        const customerResult =
            await pool.query(
                customerQuery,
                [customerRef]
            );

        if (customerResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Customer not found"
            });
            return;
        }
        const fundsQuery = `
            SELECT *
            FROM mf_customer_funds
            WHERE customer_ref = $1
        `;

        const fundsResult =
            await pool.query(
                fundsQuery,
                [customerRef]
            );

        res.status(200).json({
            success: true,
            customer: customerResult.rows[0],
            funds: fundsResult.rows
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch funds"
        });
    }
};

export const getSipsById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerRef } = req.params;
        const customerResult = await pool.query(
            `
            SELECT *
            FROM mf_customers
            WHERE customer_ref = $1
            `,
            [customerRef]
        );
        if (customerResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Customer not found"
            });
            return;
        }
        const sipResult = await pool.query(
            `
            SELECT
                ms.id,
                ms.scheme_code,
                mf.scheme_name,
                mf.amc_name,
                mf.fund_category,
                ms.sip_amount,
                ms.sip_status,
                ms.start_date,
                ms.next_due_date,

                (
                    SELECT nav_value
                    FROM mf_nav_history
                    WHERE scheme_code = ms.scheme_code
                    ORDER BY nav_date DESC
                    LIMIT 1
                ) AS latest_nav

            FROM mf_sips ms

            JOIN mf_schemes mf
            ON ms.scheme_code = mf.scheme_code

            WHERE ms.customer_ref = $1

            ORDER BY ms.created_at DESC
            `,
            [customerRef]
        );

        const enhancedSips =
            sipResult.rows.map((sip: any) => {

                const latestNav =
                    Number(sip.latest_nav || 0);

                const estimatedUnits =
                    Number(sip.sip_amount) / latestNav;

                const estimatedCurrentValue =
                    estimatedUnits * latestNav;

                return {
                    ...sip,
                    estimatedUnits,
                    estimatedCurrentValue
                };
            });

        res.status(200).json({
            success: true,
            customer: customerResult.rows[0],
            totalSips: enhancedSips.length,
            sips: enhancedSips
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch SIPs"
        });
    }
};

export const investFund = async (req: Request, res: Response): Promise<void> => {
    try {

        const {
            customerRef,
            schemeCode,
            amount
        } = req.body;

        const schemeQuery = `
            SELECT *
            FROM mf_schemes
            WHERE scheme_code = $1
        `;

        const schemeResult = await pool.query(
            schemeQuery,
            [schemeCode]
        );

        if (schemeResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Scheme not found"
            });
            return;
        }

        const scheme =
            schemeResult.rows[0];

        const units =
            Number(amount) /
            Number(scheme.nav_value);

        await pool.query(
            `
            INSERT INTO mf_customer_funds(
                customer_ref,
                scheme_code,
                units,
                invested_amount,
                current_value,
                investment_date
            )
            VALUES($1,$2,$3,$4,$5,NOW())
            `,
            [
                customerRef,
                schemeCode,
                units,
                amount,
                amount
            ]
        );

        res.status(201).json({
            success: true,
            units,
            message: "Investment successful"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Fund investment failed"
        });
    }
};

export const createSip = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerRef, schemeCode, sipAmount, startDate } = req.body;
        const customerResult = await pool.query(
            `
            SELECT *
            FROM mf_customers
            WHERE customer_ref = $1
            `,
            [customerRef]
        );

        if (customerResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Customer not found"
            });
            return;
        }
        const schemeResult = await pool.query(
            `
            SELECT *
            FROM mf_schemes
            WHERE scheme_code = $1
            `,
            [schemeCode]
        );

        if (schemeResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "Scheme not found"
            });

            return;
        }
        const navResult = await pool.query(
            `
            SELECT
                nav_value
            FROM mf_nav_history
            WHERE scheme_code = $1
            ORDER BY nav_date DESC
            LIMIT 1
            `,
            [schemeCode]
        );

        if (navResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "NAV history not found"
            });

            return;
        }

        const latestNav =
            Number(navResult.rows[0].nav_value);

        const estimatedUnits =
            Number(sipAmount) / latestNav;

        const sipResult = await pool.query(
            `
            INSERT INTO mf_sips(
                customer_ref,
                scheme_code,
                sip_amount,
                sip_status,
                start_date,
                next_due_date
            )
            VALUES($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
                customerRef,
                schemeCode,
                sipAmount,
                "ACTIVE",
                startDate,
                startDate
            ]
        );

        res.status(201).json({
            success: true,
            latestNav,
            estimatedUnits,
            sip: sipResult.rows[0],
            message: "SIP created successfully"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "SIP creation failed"
        });
    }
};

export const stopSip = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const sipResult = await pool.query(
            `
            SELECT *
            FROM mf_sips
            WHERE id = $1
            `,
            [id]
        );

        if (sipResult.rows.length === 0) {

            res.status(404).json({
                success: false,
                message: "SIP not found"
            });

            return;
        }

        const sip =
            sipResult.rows[0];

        if (sip.sip_status === "STOPPED") {

            res.status(400).json({
                success: false,
                message: "SIP already stopped"
            });

            return;
        }

        await pool.query(
            `
            UPDATE mf_sips
            SET sip_status = 'STOPPED'
            WHERE id = $1
            `,
            [id]
        );

        res.status(200).json({
            success: true,
            sipId: id,
            message: "SIP stopped successfully"
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to stop SIP"
        });
    }
};

export const getNavHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { schemeCode } = req.params;
        const navQuery = `
            SELECT
                nav_value,
                nav_date
            FROM mf_nav_history
            WHERE scheme_code = $1
            ORDER BY nav_date ASC
        `;

        const navResult = await pool.query(
            navQuery,
            [schemeCode]
        );

        res.status(200).json({
            success: true,
            schemeCode,
            history: navResult.rows
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch NAV history"
        });
    }
};

export const getSipHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { customerRef } = req.params;
        const sipQuery = `
            SELECT
                ms.id,
                ms.scheme_code,
                mf.scheme_name,
                ms.sip_amount,
                ms.sip_status,
                ms.start_date,
                ms.next_due_date
            FROM mf_sips ms

            JOIN mf_schemes mf
            ON ms.scheme_code = mf.scheme_code

            WHERE ms.customer_ref = $1
            ORDER BY ms.start_date DESC
        `;

        const sipResult = await pool.query(
            sipQuery,
            [customerRef]
        );

        res.status(200).json({
            success: true,
            customerRef,
            sips: sipResult.rows
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch SIP history"
        });
    }
};

export const getAllFunds = async (req: Request, res: Response): Promise<void> => {
    try {
        const fundQuery = `
            SELECT
    ms.scheme_code,
    ms.scheme_name,
    ms.amc_name,
    ms.fund_category,
    ms.risk_category,

    mnh.nav_value,
    mnh.nav_date

FROM mf_schemes ms

JOIN mf_nav_history mnh
ON ms.scheme_code = mnh.scheme_code

ORDER BY
    ms.scheme_code,
    mnh.nav_date DESC
        `;
        const fundResult =
            await pool.query(fundQuery);
        res.status(200).json({
            success: true,
            totalFunds:
                fundResult.rows.length,
            funds:
                fundResult.rows
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch funds"
        });
    }
};

export const getFundByScheme = async (req: Request, res: Response): Promise<void> => {
    try {
        const { schemeCode } =
            req.params;

        const fundQuery = `
            SELECT
    ms.scheme_code,
    ms.scheme_name,
    ms.amc_name,
    ms.fund_category,
    ms.risk_category,

    mnh.nav_value,
    mnh.nav_date

FROM mf_schemes ms

JOIN mf_nav_history mnh
ON ms.scheme_code = mnh.scheme_code

WHERE ms.scheme_code = $1

ORDER BY mnh.nav_date DESC
        `;

        const fundResult =
            await pool.query(
                fundQuery,
                [schemeCode]
            );

        if (
            fundResult.rows.length === 0
        ) {

            res.status(404).json({
                success: false,
                message:
                    "Fund not found"
            });

            return;
        }
        res.status(200).json({
            success: true,
            fund:
                fundResult.rows[0]
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message:
                "Failed to fetch fund"
        });
    }
};

export const getMfTransactions = async (
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

        const customerRef =
            investor.customer_ref;

        const transactionQuery = `
            SELECT
                mt.id,
                mt.scheme_code,
                ms.scheme_name,
                mt.transaction_type,
                mt.amount,
                mt.units,
                mt.nav_value,
                mt.created_at

            FROM mf_transactions mt

            JOIN mf_schemes ms
            ON mt.scheme_code = ms.scheme_code

            WHERE mt.customer_ref = $1

            ORDER BY mt.created_at DESC
        `;

        const transactionResult =
            await pool.query(
                transactionQuery,
                [customerRef]
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
                "Failed to fetch MF transactions"
        });
    }
};