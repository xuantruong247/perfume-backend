const Product = require("../models/product")
const asyncHandler = require("express-async-handler")
const slugify = require("slugify")


const createProduct = asyncHandler(async (req, res) => {
    const { title, description, price, quantity, category_id, brand_id } = req.body
    if (!title || !description || !price || !quantity || !category_id || !brand_id) throw new Error('Missing text')
    if (req.body && req.body.title) {
        req.body.slug = slugify(req.body.title)
    } else {
        req.body.slug = slugify(title)
    }
    const avatar = req?.files?.avatar[0]?.path
    const images = req.files?.images?.map(el => el.path)
    if (avatar) {
        req.body.avatar = avatar
    }
    if (images) {
        req.body.images = images

    }
    const newBrand = req.body.brand_id
    const newCategory = req.body.category_id
    const newProduct = await Product.create({ title, description, brand: newBrand, category: newCategory, price, quantity, slug: req.body.slug, avatar, images })
    return res.status(200).json({
        success: newProduct ? true : false,
        createdProduct: newProduct ? newProduct : 'Cannot create new product'
    })
})

const getDetailProduct = asyncHandler(async (req, res) => {

    const { pid } = req.params
    const product = await Product.findById(pid).populate({
        path: 'ratings',
        populate: {
            path: "postedBy",
            select: "firstname lastname avatar"
        }
    })
    return res.status(200).json({
        success: product ? true : false,
        productData: product ? product : 'Cannot not get product'
    })
})

// Filtering, sorting & pagination
const getAllProducts = asyncHandler(async (req, res) => {
    const { categoriesId, brandId, userMinPrice, userMaxPrice, sort, ...queries } = req.query
    const excludeFields = ['limit', 'sort', 'page', 'fields']
    excludeFields.forEach(el => delete queries[el])

    const perPage = 12; // Số lượng mục trên mỗi trang
    const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1


    let categoryArray = [];
    if (categoriesId) {
        categoryArray = categoriesId.split(','); // Tách chuỗi thành mảng dựa trên dấu phẩy
    }

    let brandArray = []
    if (brandId) {
        brandArray = brandId.split(',')
    }
    // Filter
    let objectFind = {};
    if (categoryArray.length > 0) {
        objectFind.category = { $in: categoryArray }; // Sử dụng $in để tìm các danh mục trong mảng
    }
    if (brandArray.length > 0) {
        objectFind.brand = { $in: brandArray }
    }
    if (queries.title) {
        objectFind.title = { $regex: queries.title, $options: 'i' };
    }

    objectFind.isHidden = false

    // Thêm điều kiện lọc theo giá trị
    if (userMinPrice || userMaxPrice) {
        objectFind.price = {}; // Khởi tạo điều kiện giá tiền
        if (userMinPrice) {
            objectFind.price.$gte = parseFloat(userMinPrice); // Lớn hơn hoặc bằng giá trị nhập vào
        }
        if (userMaxPrice) {
            objectFind.price.$lte = parseFloat(userMaxPrice); // Nhỏ hơn hoặc bằng giá trị nhập vào
        }
    }

    const counts = await Product.find(objectFind).countDocuments();

    let query = Product.find(objectFind);

    // Sort
    if (sort) {
        let sortOption = {};
        let isSort = false;

        switch (sort) {
            case "title-asc":
                sortOption.title = 1;
                isSort = true;
                break;
            case "title-desc":
                sortOption.title = -1;
                isSort = true;
                break;

            case 'price-asc':
                sortOption.price = 1;
                isSort = true;
                break;

            case "price-desc":
                sortOption.price = -1;
                isSort = true;
                break;
            case "sold":
                sortOption.sold = -1;
                isSort = true;
                break;
            case "createdAt":
                sortOption.createdAt = -1;
                isSort = true;
                break;
            case "totalRatings":
                sortOption.totalRatings = -1;
                isSort = true;
                break;
            case "5star": // Sắp xếp theo số lượt đánh giá sao giảm dần
                sortOption.totalRatings = -1;
                isSort = true;
                query = query.where('totalRatings').equals(5); // Chỉ lấy sản phẩm có số sao là 5
                break;
            case "quantity-desc":
                sortOption.quantity = -1;
                isSort = true;
                break;
            case "quantity-asc":
                sortOption.quantity = 1;
                isSort = true;
                break;
            case "sold-desc":
                sortOption.sold = -1;
                isSort = true;
                break;
            case "sold-asc":
                sortOption.sold = 1;
                isSort = true;
                break;
            default:
                break;
        }

        if (isSort === true) {
            query = query.sort(sortOption)
        }
    }


    // Query

    // Pagination
    query = query.skip((page - 1) * perPage).limit(perPage);
    query = query.populate("category", "title").populate("brand", "title");

    const response = await query.exec();

    return res.status(200).json({
        success: response ? true : false,
        counts,
        products: response ? response : 'Cannot get products'
    });
})


const updateProduct = asyncHandler(async (req, res) => {
    const { pid } = req.params;

    const files = req?.files;
    if (files) {
        if (files.avatar) req.body.avatar = files.avatar[0].path;
        if (files.images) req.body.images = files.images.map(el => el.path);
    }

    if (req.body && req.body.title) {
        req.body.slug = slugify(req.body.title);
    }

    const updatedFields = { ...req.body };

    if (req.body.category_id) {
        updatedFields.category = req.body.category_id;
    }


    if (req.body.brand_id) {
        updatedFields.brand = req.body.brand_id;
    }

    const updatedProduct = await Product.findByIdAndUpdate(pid, updatedFields, { new: true });

    return res.status(200).json({
        success: updatedProduct !== null,
        updatedProduct: updatedProduct ? updatedProduct : 'Cannot update product'
    });
});





const deleteProduct = asyncHandler(async (req, res) => {
    const { pid } = req.params
    const deletedProduct = await Product.findByIdAndDelete(pid)
    return res.status(200).json({
        success: deletedProduct ? true : false,
        deletedProduct: deletedProduct ? deletedProduct : 'Cannot delete product'
    })
})


const ratings = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const { star, comment, pid, updatedAt } = req.body;
    if (!star || !pid) {
        throw new Error('Missing text');
    }

    const ratingProduct = await Product.findById(pid);
    const alreadyRating = ratingProduct?.ratings?.find(el => el.postedBy.toString() === _id);

    if (alreadyRating) {
        // Nếu người dùng đã đánh giá, thêm đánh giá mới nhưng không ghi đè lên đánh giá cũ
        ratingProduct.ratings.push({ star, comment, postedBy: _id, updatedAt });
        await ratingProduct.save();
    } else {
        // Nếu người dùng chưa đánh giá, thêm đánh giá mới
        ratingProduct.ratings.push({ star, comment, postedBy: _id, updatedAt });
        await ratingProduct.save();
    }

    // Tính tổng số ratings và điểm trung bình
    const ratingCount = ratingProduct.ratings.length;
    const sumRatings = ratingProduct.ratings.reduce((sum, el) => sum + +el.star, 0);
    ratingProduct.totalRatings = Math.round((sumRatings / ratingCount) * 10) / 10;

    await ratingProduct.save();

    return res.status(200).json({
        status: true,
        updatedProduct: ratingProduct
    });
});


const uploadAvatarProduct = asyncHandler(async (req, res) => {
    const { pid } = req.params;
    if (!req.file) throw new Error("Missing file");

    const avatarPath = req.file.path;

    const response = await Product.findByIdAndUpdate(
        pid,
        { $set: { avatar: avatarPath } }, // Sử dụng $set để ghi đè trường avatar
        { new: true }
    );

    return res.status(200).json({
        status: response ? true : false,
        updatedProduct: response ? response : "Cannot upload product image"
    });
});



const uploadImagesProduct = asyncHandler(async (req, res) => {
    const { pid } = req.params
    if (!req.files) throw new Error("Missting text")
    const response = await Product.findByIdAndUpdate(pid, { $push: { images: { $each: req.files.map(el => el.path) } } }, { new: true })
    return res.status(200).json({
        status: response ? true : false,
        updatedProduct: response ? response : "Cannot upload images product"

    })
})

const hideProduct = asyncHandler(async (req, res) => {
    const { pid } = req.params

    const productToHide = await Product.findById(pid);

    if (!productToHide) throw new Error("pid not found")

    productToHide.isHidden = true;

    const updatedProduct = await productToHide.save();

    return res.status(200).json({
        success: true,
        hiddenProduct: updatedProduct,
    });
})

module.exports = {
    createProduct,
    getDetailProduct,
    getAllProducts,
    updateProduct,
    deleteProduct,
    ratings,
    uploadAvatarProduct,
    uploadImagesProduct,
    hideProduct
}