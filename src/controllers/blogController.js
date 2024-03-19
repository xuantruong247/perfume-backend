const Blog = require("../models/blog")
const asyncHandler = require("express-async-handler")

const createNewBlog = asyncHandler(async (req, res) => {
    const { title, description, } = req.body
    if (!title || !description) throw new Error("Missting text")

    const imageThum = req.files.imageThum[0].path
    if (imageThum) {
        req.body.imageThum = imageThum
    }
    const response = await Blog.create({ title, description, imageThum })
    return res.status(200).json({
        success: response ? true : false,
        createdBlog: response ? response : "Cannot create new blog "
    })
})


const updateBlog = asyncHandler(async (req, res) => {
    const { bid } = req.params
    const file = req?.files

    if (file) {
        if (file.imageThum) {
            req.body.imageThum = file.imageThum[0].path
        }
    }

    const updatedFields = { ...req.body }

    const response = await Blog.findByIdAndUpdate(bid, updatedFields, { new: true })
    return res.status(200).json({
        success: response !== null,
        updatedBlog: response ? response : "Cannot update blog "
    })
})

const getAllBlogs = asyncHandler(async (req, res) => {
    const { page = 1, limit = 7 } = req.query;
    let query = Blog.find()
    const counts = await Blog.find().countDocuments();
    query = query.limit(parseInt(limit)).skip((page - 1) * limit)
    const response = await query.exec()
    return res.status(200).json({
        success: response ? true : false,
        getBlogs: response ? response : "Cannot get blog ",
        counts
    })
})



const likeBlog = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { bid } = req.params
    const blog = await Blog.findById(bid)
    const alreadyDisliked = blog?.dislikes?.find(el => el.toString() === _id)
    if (alreadyDisliked) {
        const response = await Blog.findByIdAndUpdate(bid, { $pull: { dislikes: _id }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response
        })
    }
    const isLiked = blog?.likes.find(el => el.toString() === _id)
    if (isLiked) {
        const response = await Blog.findByIdAndUpdate(bid, { $pull: { likes: _id }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response
        })
    } else {
        const response = await Blog.findByIdAndUpdate(bid, { $push: { likes: _id }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response
        })
    }
})



const dislikeBlog = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { bid } = req.params
    if (!bid) throw new Error("Blog not found")
    const blog = await Blog.findById(bid)
    const alreadyLiked = blog?.likes?.find(el => el.toString() === _id)
    if (alreadyLiked) {
        const response = await Blog.findByIdAndUpdate(bid, { $pull: { likes: _id }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response
        })
    }
    const isDisliked = blog?.dislikes.find(el => el.toString() === _id)
    if (isDisliked) {
        const response = await Blog.findByIdAndUpdate(bid, { $pull: { dislikes: _id }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response
        })
    } else {
        const response = await Blog.findByIdAndUpdate(bid, { $push: { dislikes: _id }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response
        })
    }
})



const getBlog = asyncHandler(async (req, res) => {
    const { bid } = req.params
    const blog = await Blog.findByIdAndUpdate(bid, { $inc: { numberViews: 1 } }, { new: true }).populate("likes", "firstname lastname").populate("dislikes", "firstname lastname")
    return res.status(200).json({
        success: blog ? true : false,
        getBlog: blog ? blog : "Something went wrong"
    })
})

const deleteBlog = asyncHandler(async (req, res) => {
    const { bid } = req.params
    if (!bid) throw new Error("Blog not found")
    const response = await Blog.findByIdAndDelete(bid)
    return res.status(200).json({
        success: response ? true : false,
        message: response ? "Deleted Blog Successfully" : "Cannot Deleted blog"
    })
})


const uploadImageBlog = asyncHandler(async (req, res) => {
    const { bid } = req.params
    if (!req.file) throw new Error("Missting text")
    const response = await Blog.findByIdAndUpdate(bid, { image: req.file.path }, { new: true })
    return res.status(200).json({
        status: response ? true : false,
        updatedBlog: response ? response : "Cannot upload images blog"

    })
})

module.exports = {
    createNewBlog,
    updateBlog,
    getAllBlogs,
    likeBlog,
    dislikeBlog,
    getBlog,
    deleteBlog,
    uploadImageBlog
}
