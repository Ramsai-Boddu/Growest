import {
    Request,
    Response,
    NextFunction
} from "express";

import pool from "../config/db";

import { UAParser }
    from "ua-parser-js";

const auditMiddleware = (
    serviceName: string
) => {

    return (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {

        const startTime =
            Date.now();

        res.on(
            "finish",

            async () => {

                try {

                    const responseTime =
                        Date.now() -
                        startTime;

                    const parser =
                        new UAParser(
                            req.headers[
                            "user-agent"
                            ]
                        );

                    const uaResult =
                        parser.getResult();

                    const browser =
                        uaResult.browser.name ||
                        "Unknown";

                    const os =
                        uaResult.os.name ||
                        "Unknown";

                    const device =
                        uaResult.device.type ||
                        "Desktop";

                    const ipAddress =
                        (
                            req.headers[
                            "x-forwarded-for"
                            ] as string
                        )?.split(",")[0]

                        ||

                        req.socket.remoteAddress

                        ||

                        req.ip

                        ||

                        "Unknown";

                    await pool.query(
                        `
    INSERT INTO audit_logs(
        service_name,
        action,
        endpoint,
        request_method,
        ip_address,
        status_code,
        response_time_ms,
        success,
        created_at
    )
    VALUES(
        $1,$2,$3,$4,
        $5,$6,$7,$8,
        NOW()
    )
    `,
                        [
                            serviceName,
                            `${req.method} ${req.originalUrl}`,
                            req.originalUrl,
                            req.method,
                            ipAddress,
                            res.statusCode,
                            responseTime,
                            res.statusCode < 400
                        ]
                    );

                } catch (error) {

                    console.log(
                        "Audit Log Error",
                        error
                    );
                }
            }
        );

        next();
    };
};

export default auditMiddleware;