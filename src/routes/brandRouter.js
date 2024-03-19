const express = require("express")
const ctrls = require("../controllers/brandController")
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const router = express.Router()

router.post("/create", [verifyAccessToken, isAdmin], ctrls.createNewBrand)
router.get("/", ctrls.getAllBrands)

router.put("/update/:bid", [verifyAccessToken, isAdmin], ctrls.updatedBrand)
router.delete("/delete/:bid", [verifyAccessToken, isAdmin], ctrls.deletedBrand)

module.exports = router
