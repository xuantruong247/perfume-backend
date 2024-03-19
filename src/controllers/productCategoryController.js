const ProductCategory = require("../models/productCategory")
const aysncHandler = require("express-async-handler")

const createCategory = aysncHandler(async (req, res) => {
    const response = await ProductCategory.create(req.body)
    return res.status(200).json({
        success: response ? true : false,
        createdCategory: response ? response : "Cannot create new product category"
    })
})


const getCategories = aysncHandler(async (req, res) => {
    const response = await ProductCategory.find().select('title _id')
    return res.status(200).json({
        success: response ? true : false,
        getProductsCategory: response ? response : "Cannot get all product category"
    })
})


const updatedCategory = aysncHandler(async (req, res) => {
    const { pcid } = req.params
    const response = await ProductCategory.findByIdAndUpdate(pcid, req.body, { new: true })
    return res.status(200).json({
        success: response ? true : false,
        updateProductCategory: response ? response : "Cannot updated product category"
    })
})


const deletedCategory = aysncHandler(async (req, res) => {
    const { pcid } = req.params

    const response = await ProductCategory.findByIdAndDelete(pcid)
    return res.status(200).json({
        success: response ? true : false,
        deletedProductCategory: response ? response : "Cannot delete product category"
    })
})



module.exports = {
    createCategory,
    getCategories,
    updatedCategory,
    deletedCategory
}