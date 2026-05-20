import express from "express";
import cors from "cors";
import portfolioRoutes from "./routes/portfolioRoutes";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import navRoutes from "./routes/navRoutes";
import auditMiddleware from "./middleware/auditMiddleware";
import buyRoutes from "./routes/buyRoutes";


const app = express();

app.use(cors());
app.use(express.json());
app.use(auditMiddleware("GATEWAY_SERVICE"));

app.use("/auth", authRoutes);
app.use("/portfolio",portfolioRoutes);
app.use("/bs",buyRoutes)
app.use("/admin",adminRoutes)
app.use("/hist",navRoutes)

app.listen(4000, () => {
    console.log("Gateway server running on port 4000");
});