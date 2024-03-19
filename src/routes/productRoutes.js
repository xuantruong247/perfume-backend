const express = require("express")
const ctrls = require("../controllers/productController")
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const uploader = require("../config/cloudinary.config")
const router = express.Router()

router.post("/create", [verifyAccessToken, isAdmin], uploader.fields([
    { name: "avatar", maxCount: 1 },
    { name: "images", maxCount: 10 },
]), ctrls.createProduct)
router.get("/", ctrls.getAllProducts)
router.put("/ratings", [verifyAccessToken], ctrls.ratings)
router.put("/hidden/:pid", [verifyAccessToken, isAdmin], ctrls.hideProduct)
router.put("/uploadimage/:pid", [verifyAccessToken, isAdmin], uploader.array("images", 10), ctrls.uploadImagesProduct)
router.put("/uploadAvatar/:pid", [verifyAccessToken, isAdmin], uploader.single("avatar"), ctrls.uploadAvatarProduct)
router.delete("/delete/:pid", [verifyAccessToken, isAdmin], ctrls.deleteProduct)
router.put("/update/:pid", [verifyAccessToken, isAdmin], uploader.fields([
    { name: "avatar", maxCount: 1 },
    { name: "images", maxCount: 10 },
]), ctrls.updateProduct)
router.get("/:pid", ctrls.getDetailProduct)

module.exports = router
