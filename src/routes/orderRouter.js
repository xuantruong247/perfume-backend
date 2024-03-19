const express = require("express")
const ctrls = require("../controllers/orderController")
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const router = express.Router()


router.post("/create", [verifyAccessToken], ctrls.createNewOrder)
router.post("/refundPaypal", [verifyAccessToken], ctrls.refundPaypal)
router.get("/", [verifyAccessToken, isAdmin], ctrls.getAllOrders)
router.get("/userorder", [verifyAccessToken], ctrls.getUserOrder)
router.get("/week-sales", [verifyAccessToken, isAdmin], ctrls.getWeekSales)
router.get("/total-by-day", [verifyAccessToken,isAdmin],ctrls.revenueByDay)
router.get("/total-day", [verifyAccessToken, isAdmin], ctrls.totalDay)
router.get("/total-month", [verifyAccessToken, isAdmin], ctrls.getTotalMonths)


router.get("/detail-order/:oid", [verifyAccessToken], ctrls.getDetailOrder)

router.put("/cancelOrder/:oid", [verifyAccessToken], ctrls.cancelOrder)
router.put("/refundOrder/:oid", [verifyAccessToken], ctrls.refundOrder)


router.delete("/delete/:oid", [verifyAccessToken, isAdmin], ctrls.deleteOrder)
router.put("/status/:oid", [verifyAccessToken, isAdmin], ctrls.updateStatusOrder)
module.exports = router
