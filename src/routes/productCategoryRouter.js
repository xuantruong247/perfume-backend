const express = require("express")
const ctrls = require("../controllers/productCategoryController")
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const router = express.Router()


router.post("/create", [verifyAccessToken, isAdmin], ctrls.createCategory)
router.get("/", ctrls.getCategories)
router.put("/update/:pcid", [verifyAccessToken, isAdmin], ctrls.updatedCategory)
router.delete("/delete/:pcid", [verifyAccessToken, isAdmin], ctrls.deletedCategory)


module.exports = router
