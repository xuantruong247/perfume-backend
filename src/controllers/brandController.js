const Brand = require("../models/brand")
const aysncHandler = require("express-async-handler")

const createNewBrand = aysncHandler(async (req, res) => {
    const response = await Brand.create(req.body)
    return res.status(200).json({
        success: response ? true : false,
        createdBrand: response ? response : "Cannot create new brand"
    })
})


const getAllBrands = aysncHandler(async (req, res) => {
    const response = await Brand.find()
    return res.status(200).json({
        success: response ? true : false,
        getBrandCategory: response ? response : "Cannot get all brand"
    })
})


const updatedBrand = aysncHandler(async (req, res) => {
    const { bid } = req.params
    const response = await Brand.findByIdAndUpdate(bid, req.body, { new: true })
    return res.status(200).json({
        success: response ? true : false,
        updateBrand: response ? response : "Cannot updated brand"
    })
})


const deletedBrand = aysncHandler(async (req, res) => {
    const { bid } = req.params
    const response = await Brand.findByIdAndDelete(bid)
    return res.status(200).json({
        success: response ? true : false,
        deletedBrand: response ? "Deleted brand successfully!" : "Cannot delete brand"
    })
})



module.exports = {
    createNewBrand,
    getAllBrands,
    updatedBrand,
    deletedBrand
}