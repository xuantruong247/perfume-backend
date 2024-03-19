const User = require("../models/user")
const asyncHandler = require("express-async-handler")
const { generateAccessToken, generateRefreshToken } = require("../middlewares/jwt")
const jwt = require("jsonwebtoken")
const sendMail = require("../utils/sendMail")
const crypto = require("crypto")
const makeToken = require("uniqid")
const { users } = require("../utils/constant")


// const register = asyncHandler(async (req, res) => {
//     const { email, password, firstname, lastname, mobile } = req.body
//     console.log(req.body);
//     if (!email || !password || !firstname || !lastname || !mobile) {
//         return res.status(400).json({
//             sucess: false,
//             message: "Missing Text"
//         })
//     }
//     const checkEmail = await User.findOne({ email })
//     if (checkEmail) throw new Error("Email has existed")
//     const checkMobile = await User.findOne({ mobile })
//     if (checkMobile) throw new Error("Mobile has existed")
//     else {
//         const token = makeToken()
//         const emailEdited = btoa(email) + '@' + token
//         const newUser = await User.create({
//             email: emailEdited, password, firstname, lastname, mobile
//         })
//         if (newUser) {
//             const html = `<h2>Register code: </h2> <br/> <blockquote>${token}</blockquote>`

//             await sendMail({ email, html, subject: "Confirm register account in Perfume Since 2001"})
//         }

//         setTimeout(async () => {
//             await User.deleteOne({ email: emailEdited })
//         }, [300000])

//         return res.status(200).json({
//             success: newUser ? true : false,
//             message: newUser ? "Please check your email to active account" : "Something went wrong, please try later"
//         })
//     }

// })

const register = asyncHandler(async (req, res) => {
    const { email, password, firstname, lastname, mobile } = req.body
    console.log(req.body);
    if (!email || !password || !firstname || !lastname || !mobile) {
        return res.status(400).json({
            sucess: false,
            message: "Missing Text"
        })
    }
    const checkEmail = await User.findOne({ email })
    if (checkEmail) throw new Error("Email has existed")
    const checkMobile = await User.findOne({ mobile })
    if (checkMobile) throw new Error("Mobile has existed")
    else {
        const newUser = await User.create({
            email, password, firstname, lastname, mobile
        })
        if (newUser) {
            return res.status(200).json({
                success: true,
                message: "Register successful"
            })
        }
    }
})

const finalRegister = asyncHandler(async (req, res) => {
    // const cookie = req.cookies
    const { token } = req.params
    const notActivedEmail = await User.findOne({ email: new RegExp(`${token}$`) })
    if (notActivedEmail) {
        notActivedEmail.email = atob(notActivedEmail?.email?.split('@')[0])
        notActivedEmail.save()
}
    return res.status(200).json({
        success: notActivedEmail ? true : false,
        response: notActivedEmail ? 'Register is SUccessfully. Please go login~~' : "Something went wrong, please try later"
    })
})





//login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({
            sucess: false,
            message: "Missing Text"
        })
    }
    // plain object
    const response = await User.findOne({ email })
    if (response && await response.isCorrectPassword(password)) {
        // Tách password và role ra khỏi response
        const { password, role, refreshToken, ...userData } = response.toObject()
        // create access token
        const accessToken = generateAccessToken(response._id, role)
        //create refresh token
        const newRefreshToken = generateRefreshToken(response._id)
        // save refreshToken DB
        await User.findByIdAndUpdate(response._id, { refreshToken: newRefreshToken }, { new: true })
        // save refreshToken cookie
        res.cookie("refreshToken", newRefreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
        return res.status(200).json({
            success: true,
            accessToken,

        })
    } else {
        throw new Error("Wrong Email or Password")
    }

})

const getCurrent = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const user = await User.findById(_id).select('-refreshToken -password ')
        .populate({
            path: "cart",
            populate: {
                path: "product",
                select: "title avatar price"
            }
        }).populate({
            path: "wishlist",
            select: "title avatar price"
        });

    return res.status(200).json({
        success: user ? true : false,
        rs: user ? user : 'User not found'
    })
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    //lấy token từ cookies
    const cookie = req.cookies
    // check có token hay không
    if (!cookie && !cookie.refreshToken) throw new Error("No refresh token in cookies")

    const rs = await jwt.verify(cookie.refreshToken, process.env.JWT_SECRET)
    const response = await User.findOne({ _id: rs._id, refreshToken: cookie.refreshToken })
    return res.status(200).json({
        success: response ? true : false,
        newAccessToken: response ? generateAccessToken(response._id, response.role) : "Refresh token not matched"
    })
})

const logout = asyncHandler(async (req, res) => {
    const cookie = req.cookies
    if (!cookie || !cookie.refreshToken) throw new Error("No refresh token in cookies")
    // xoá refresh token db
    await User.findOneAndUpdate({ refreshToken: cookie.refreshToken }, { refreshToken: " " }, { new: true })
    // Xoá refresh token ở cookies
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true
    })
    return res.status(200).json({
        success: true,
        message: "Logout Successfully!!!"
    })
})

// client gửi email
// server check email có hợp lệ hay không, nếU hợp lệ thì gửi email + kèm theo link (password change token)
// client check mail => click link
// client gửi api kèm theo token
// check token có giống với token mà server gửi email hay không
// change passowrd

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body
    if (!email) throw new Error('Missing email')
    const user = await User.findOne({ email })
    if (!user) throw new Error('User not found')
    const resetToken = user.createPasswordChangedToken()
    await user.save()

    const html = `Please click on the link below to change your password. This link will expire 15 minutes from now. <a href=${process.env.CLIENT_URL}/reset-password/${resetToken}>Click here</a>`

    const data = {
        email,
        html,
        subject: "Forgot password"
    }
    const rs = await sendMail(data)
    return res.status(200).json({
        success: true,
        message: "Check Your Mail!!!"
    })
})


const resetPassword = asyncHandler(async (req, res) => {
    const { password, token } = req.body
    if (!password || !token) throw new Error("Missing Text")
    const passwordResetToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne({ passwordResetToken, passwordResetExpires: { $gt: Date.now() } })
    if (!user) throw new Error("Invalid reset token")
    user.password = password
    user.passwordResetToken = undefined
    user.passwordChangedAt = Date.now()
    user.passwordResetExpires = undefined
    await user.save()
    return res.status(200).json({
        success: user ? true : false,
        message: user ? "Update password " : "Something went wrong"

    })
})


const getUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, sortField, sortOrder } = req.query;

    let query = User.find().select('-refreshToken -password');

    const counts = await User.find().countDocuments();


    // Sắp xếp dữ liệu nếu có yêu cầu
    if (sortField && sortOrder) {
        const sortOption = {};
        sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
        query = query.sort(sortOption);
    }

    // Giới hạn số lượng kết quả trả về
    query = query.limit(parseInt(limit)).skip((page - 1) * limit);

    const response = await query.exec();

    return res.status(200).json({
        success: response ? true : false,
        counts,
        users: response
    });
});


const deleteUser = asyncHandler(async (req, res) => {
    const { uid } = req.params
    const response = await User.findByIdAndDelete(uid)
    return res.status(200).json({
        success: response ? true : false,
        deletedUser: response ? `User with email ${response.email} deleted` : "No user delete"
    })
})


const updateUser = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { firstname, lastname, email, mobile, address, numberBank, nameBank } = req.body
    const data = { firstname, lastname, email, mobile, address, numberBank, nameBank }
    if (req.file) {
        data.avatar = req.file.path
    }
    if (!_id || Object.keys(req.body).length === 0) throw new Error("Missting text")
    const response = await User.findByIdAndUpdate(_id, data, { new: true }).select('-refreshToken -password -role')
    return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? response : "Something went wrong"
    })
})

const updateUserByAdmin = asyncHandler(async (req, res) => {
    const { uid } = req.params
    if (Object.keys(req.body).length === 0) throw new Error("Missting text")
    const response = await User.findByIdAndUpdate(uid, req.body, { new: true }).select('-refreshToken -password -role')
    return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? "Update successfully!!" : "Something went wrong"
    })
})


const updateAddressUser = asyncHandler(async (req, res) => {
    const { _id } = req.user
    if (!req.body.address) throw new Error("Missting text")
    const response = await User.findByIdAndUpdate(_id, { $push: { address: req.body.address } }, { new: true }).select('-refreshToken -password -role')
    return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? response : "Something went wrong"
    })
})


const updateCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { pid, quantity = 1 } = req.body
    if (!pid) throw new Error("Missting text")
    const user = await User.findById(_id).select("cart")
    const alreadyProduct = user?.cart?.find(el => el.product.toString() === pid)
    if (alreadyProduct) {
        const response = await User.updateOne(
            { "_id": _id, "cart.product": pid },
            { $inc: { "cart.$.quantity": 1 } }
        );
        return res.status(200).json({
            success: response ? true : false,
            updatedUser: response ? "Update quantity successfully" : "Something went wrong"
        })
    } else {
        const response = await User.findByIdAndUpdate(_id, { $push: { cart: { product: pid, quantity } } }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            updatedUser: response ? response : "Something went wrong"
        })
    }
})

const removeProductInCart = asyncHandler(async (req, res) => {
    const { _id } = req.user
    const { pid } = req.params
    const user = await User.findById(_id).select("cart")
    const alreadyProduct = user?.cart?.find(el => el.product.toString() === pid)
    if (!alreadyProduct) {
        return res.status(200).json({
            success: response ? true : false,
            updatedUser: response ? "Update quantity successfully" : "Something went wrong"
        })
    }
    const response = await User.findByIdAndUpdate(_id, { $pull: { cart: { product: pid } } }, { new: true })
    return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? response : "Something went wrong"
    })
})



const createUsers = asyncHandler(async (req, res) => {
    const response = await User.create(users)
    return res.status(200).json({
        success: response ? true : false,
        updatedUser: response ? response : "Something went wrong"
    })
})



const updateWishlist = asyncHandler(async (req, res) => {
    const { pid } = req.params
    const { _id } = req.user
    const user = await User.findById(_id)
    const alreadyWishlist = user.wishlist?.find(el => el.toString() === pid)
    if (alreadyWishlist) {
        const response = await User.findByIdAndUpdate(_id, { $pull: { wishlist: pid }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response ? "Updated ypur wishlist." : "Failed to update wishlist"
        })
    } else {
        const response = await User.findByIdAndUpdate(_id, { $push: { wishlist: pid }, }, { new: true })
        return res.status(200).json({
            success: response ? true : false,
            message: response ? "Updated your wishlist." : "Failed to update wishlist"
        })
    }
})


module.exports = {
    register,
    login,
    getCurrent,
    refreshAccessToken,
    logout,
    forgotPassword,
    resetPassword,
    getUsers,
    deleteUser,
    updateUser,
    updateUserByAdmin,
    updateAddressUser,
    updateCart,
    finalRegister,
    createUsers,
    removeProductInCart,
    updateWishlist
}