const userRouter = require("./userRouter")
const productRouter = require("./productRoutes")
// const blogCategoryRouter = require("./blogCetegoryRouter")
const categoryRouter = require("./productCategoryRouter")
const blogRouter = require("./blogRouter")
const brandRouter = require("./brandRouter")
// const couponRouter = require("./couponRouter")
const orderRouter = require("./orderRouter")
const { notFound, errHandler } = require("../middlewares/errorHandler")

const indexRoutes = (app) => {
    app.use("/user", userRouter)
    app.use("/product", productRouter)
    app.use("/productcategory", categoryRouter)
    // app.use("/blogcategory", blogCategoryRouter)
    app.use("/blog", blogRouter)
    app.use("/brand", brandRouter)
    // app.use("/coupon", couponRouter)
    app.use("/order", orderRouter)



    app.use(notFound)
    app.use(errHandler)
}


module.exports = indexRoutes