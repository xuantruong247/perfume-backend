const express = require("express")
const ctrls = require("../controllers/blogController")
const { verifyAccessToken, isAdmin } = require("../middlewares/verifyToken")
const uploader = require("../config/cloudinary.config")
const router = express.Router()


router.get("/", ctrls.getAllBlogs)
router.post("/create", [verifyAccessToken, isAdmin], uploader.fields([
    { name: "imageThum", maxCount: 1 }
]), ctrls.createNewBlog)

router.delete("/delete/:bid", [verifyAccessToken, isAdmin], ctrls.deleteBlog)
router.get("/:bid", [verifyAccessToken], ctrls.getBlog)
router.put("/uploadimage/:bid", [verifyAccessToken, isAdmin], uploader.single("image"), ctrls.uploadImageBlog)
router.put("/like/:bid", [verifyAccessToken], ctrls.likeBlog)
router.put("/dislike/:bid", [verifyAccessToken], ctrls.dislikeBlog)
router.put("/update/:bid", [verifyAccessToken, isAdmin], uploader.fields([
    { name: "imageThum", maxCount: 1 }
]), ctrls.updateBlog)

module.exports = router
