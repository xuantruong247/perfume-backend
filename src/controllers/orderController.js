const Order = require("../models/order")
const User = require("../models/user")
const asyncHandler = require("express-async-handler")
const moment = require("moment")
const paypal = require("paypal-rest-sdk")
const axios = require("axios")


const createNewOrder = asyncHandler(async (req, res) => {
    const { _id } = req.user;
    const { products, total, address } = req.body;
    if (address) {
        await User.findByIdAndUpdate(_id, { address, cart: [] });
    }

    const data = {
        products,
        total,
        postedBy: _id,
    };
    const response = await Order.create(data);
    // for (const product of products) {
    //     const { _id: productId, quantity } = product;

    //     // Tìm sản phẩm và chỉ cập nhật trường "sold"
    //     await Product.findByIdAndUpdate(productId, {
    //         $inc: { sold: quantity },
    //     });
    // }

    // Lấy ID của đơn hàng vừa tạo
    const orderId = response._id;

    // Cập nhật mảng `purchaseHistory` của người dùng
    await User.findByIdAndUpdate(_id, {
        $push: {
            purchaseHistory: {
                order: orderId,
            }
        }
    });

    return res.status(200).json({
        success: response ? true : false,
        response: response ? response : "Something went wrong",
    });
})






const getUserOrder = asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, statusOrderId } = req.query;

    const { _id } = req.user;

    let query = Order.find();


    let statusOrderArray = [];
    if (statusOrderId) {
        statusOrderArray = statusOrderId.split(','); // Tách chuỗi thành mảng dựa trên dấu phẩy
    }
    let objectFind = {};
    if (statusOrderArray.length > 0) {
        objectFind.statusOrder = { $in: statusOrderArray }; // Sử dụng $in để tìm các danh mục trong mảng
    }

    objectFind.postedBy = _id;

    const counts = await Order.find(objectFind).countDocuments();

    query = Order.find(objectFind);


    query = query.limit(parseInt(limit)).skip((page - 1) * limit);

    query = query.populate({
        path: 'products.product',
        select: 'avatar title price'
    });

    const response = await query.exec();

    let totalSum = 0;
    for (const order of response) {
        totalSum += order.total;
    }
    const formattedTotalSum = totalSum.toFixed(2);

    return res.status(200).json({
        success: response ? true : false,
        counts,
        totalSum: formattedTotalSum,
        getOrders: response ? response : "Cannot get order ",
    });
});




const getAllOrders = asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, sortField, sortOrder, startDays, endDays, statusOrderId, statusPaymentId, sortTotal } = req.query;
    let query = Order.find();


    let statusOrderArray = [];
    if (statusOrderId) {
        statusOrderArray = statusOrderId.split(','); // Tách chuỗi thành mảng dựa trên dấu phẩy
    }

    let statusPaymentArray = []
    if (statusPaymentId) {
        statusPaymentArray = statusPaymentId.split(",")
    }

    let objectFind = {};
    if (statusOrderArray.length > 0) {
        objectFind.statusOrder = { $in: statusOrderArray }; // Sử dụng $in để tìm các danh mục trong mảng
    }
    if (statusPaymentArray.length > 0) {
        objectFind.statusPayment = { $in: statusPaymentArray }; // Sử dụng $in để tìm các danh mục trong mảng
    }
    if (startDays || endDays) {
        objectFind.createdAt = {};
        if (startDays) {
            objectFind.createdAt.$gte = new Date(startDays);
            objectFind.createdAt.$lte = new Date(startDays + 'T23:59:59.999Z');
        }
        if (endDays) {
            objectFind.createdAt.$lte = new Date(endDays + 'T23:59:59.999Z');
        }
    }


    const counts = await Order.find(objectFind).countDocuments();

    query = Order.find(objectFind).select('-updatedAt');
    query = query.populate({
        path: 'postedBy',
        select: 'firstname lastname',
    });

    if (sortTotal) {
        query = query.sort({ total: sortTotal === "totalPrice" ? -1 : 1 });
    } else if (sortField && sortOrder) {
        const sortOption = {};
        sortOption[sortField] = sortOrder === 'asc' ? 1 : -1;
        query = query.sort(sortOption);
    }




    query = query.limit(parseInt(limit)).skip((page - 1) * limit);

    const response = await query.exec();

    let totalSum = 0;
    for (const order of response) {
        totalSum += order.total;
    }
    const formattedTotalSum = totalSum.toFixed(2);

    return res.status(200).json({
        success: response ? true : false,
        counts,
        totalSum: formattedTotalSum,
        getOrders: response ? response : "Cannot get order ",
    });
});


const getDetailOrder = asyncHandler(async (req, res) => {
    const { oid } = req.params
    const order = await Order.findById(oid).populate('products.product', 'avatar title price').populate({
        path: 'postedBy',
        select: 'lastname firstname'
    });


    if (!order) throw new Error("Order not found")

    return res.status(200).json({
        success: order ? true : false,
        getDetailOrder: order ? order : 'Order not found'
    })

})

const getWeekSales = asyncHandler(async (req, res) => {
    const today = moment();
    let startOfWeek, endOfWeek;
    if (req.query.startDays && req.query.endDays) {
        startOfWeek = moment(req.query.endDays).subtract(req.query.startDays, 'days');
        endOfWeek = moment(req.query.endDays);
    } else {
        startOfWeek = today.clone().startOf('week').day(0);
        endOfWeek = today.clone().startOf('week').day(6);
    }


    const weekSale = await Order.aggregate([
        {
            $match: { createdAt: { $gte: new Date(startOfWeek), $lt: new Date(endOfWeek) } },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'postedBy',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $project: {
                day: { $dayOfWeek: "$createdAt" },
                sales: "$total",
                postedBy: "$postedBy",
                orderDate: "$createdAt",
                statusPayment: "$statusPayment",
                statusOrder: "$statusOrder",
                orderId: "$_id",
                firstname: { $arrayElemAt: ["$user.firstname", 0] },
                lastname: { $arrayElemAt: ["$user.lastname", 0] }
            },
        },
        {
            $match: { statusPayment: { $ne: "Cancelled" } }
        },
        {
            $group: {
                _id: "$day",
                total: { $sum: "$sales" },
                salesInfo: {
                    $push: {
                        statusPayment: "$statusPayment",
                        statusOrder: "$statusOrder",
                        orderDate: "$orderDate",
                        userId: "$postedBy",
                        firstname: "$firstname",
                        lastname: "$lastname",
                        total: "$sales",
                        orderId: "$orderId",
                    }
                }
            },
        },
    ]);

    const totalWeekSales = weekSale.reduce((total, day) => total + day.total, 0);


    const formattedTotalSum = totalWeekSales.toFixed(2);


    return res.status(200).json({
        success: weekSale ? true : false,
        weekSale: weekSale ? weekSale : "Something went wrong",
        totalWeekSales: formattedTotalSum,
    });
});



const getTotalMonths = asyncHandler(async (req, res) => {
    let startOfMonth, endOfMonth;

    if (req.body && req.body.startDays && req.body.endDays) {
        startOfMonth = moment(req.body.startDays).startOf('day');
        endOfMonth = moment(req.body.endDays).endOf('day');
    } else {
        const today = moment();
        startOfMonth = today.clone().startOf('month').startOf('day');
        endOfMonth = today.clone().endOf('month').endOf('day');
    }
    try {


        const monthSales = await Order.aggregate([
            {
                $match: { createdAt: { $gte: new Date(startOfMonth), $lte: new Date(endOfMonth) } },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'postedBy',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    day: { $dayOfWeek: "$createdAt" },
                    sales: "$total",
                    postedBy: "$postedBy",
                    orderDate: "$createdAt",
                    statusPayment: "$statusPayment",
                    statusOrder: "$statusOrder",
                    orderId: "$_id",
                    firstname: { $arrayElemAt: ["$user.firstname", 0] },
                    lastname: { $arrayElemAt: ["$user.lastname", 0] }
                },
            },
            {
                $match: { statusPayment: { $ne: "Cancelled" } }
            },
            {
                $group: {
                    _id: "$day",
                    total: { $sum: "$sales" },
                    salesInfo: {
                        $push: {
                            statusPayment: "$statusPayment",
                            statusOrder: "$statusOrder",
                            orderDate: "$orderDate",
                            userId: "$postedBy",
                            firstname: "$firstname",
                            lastname: "$lastname",
                            total: "$sales",
                            orderId: "$orderId",
                        }
                    }
                },
            },
        ]);

        const totalMonthSales = monthSales.reduce((total, day) => total + day.total, 0);
        const formattedTotalSum = totalMonthSales.toFixed(2);



        return res.status(200).json({
            success: monthSales ? true : false,
            monthSales: monthSales ? monthSales : "Đã xảy ra lỗi",
            totalMonthSales: formattedTotalSum,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Đã xảy ra lỗi khi lấy dữ liệu.' });
    }
});

const revenueByDay = asyncHandler(async (req, res) => {
    const { startDay, endDay } = req.query
    const today = moment();
    console.log(req.query);
    let startOfWeek, endOfWeek;
    if (req.query.startDays && req.query.endDays) {
        startOfWeek = moment(req.query.endDays).subtract(req.query.startDays, 'days');
        endOfWeek = moment(req.query.endDays);
    } else {
        startOfWeek = today.clone().startOf('month').day(0);
        endOfWeek = today.clone().startOf('month').day(30);
    }

    if (!startDay && !endDay) {
        return res.status(200).json({
            success: false,
            weekSale: [],
            totalWeekSales: '0.00',
        });
    }
    console.log(req.query);
    const formattedStartDay = moment(startDay).startOf('day');
    const formattedEndDay = moment(endDay).endOf('day');
    const weekSale = await Order.aggregate([
        {
            $match:
            {
                createdAt:
                {
                    $gte: formattedStartDay.toDate(),
                    $lte: formattedEndDay.toDate()
                }
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'postedBy',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $project: {
                day: { $dayOfWeek: "$createdAt" },
                sales: "$total",
                postedBy: "$postedBy",
                orderDate: "$createdAt",
                statusPayment: "$statusPayment",
                statusOrder: "$statusOrder",
                orderId: "$_id",
                firstname: { $arrayElemAt: ["$user.firstname", 0] },
                lastname: { $arrayElemAt: ["$user.lastname", 0] }
            },
        },
        {
            $match: { statusPayment: { $ne: "Cancelled" } }
        },
        {
            $group: {
                _id: "$day",
                total: { $sum: "$sales" },
                salesInfo: {
                    $push: {
                        statusPayment: "$statusPayment",
                        statusOrder: "$statusOrder",
                        orderDate: "$orderDate",
                        userId: "$postedBy",
                        firstname: "$firstname",
                        lastname: "$lastname",
                        total: "$sales",
                        orderId: "$orderId",
                    }
                }
            },
        },
    ]);

    const totalWeekSales = weekSale.reduce((total, day) => total + day.total, 0);


    const formattedTotalSum = totalWeekSales.toFixed(2);


    return res.status(200).json({
        success: weekSale ? true : false,
        weekSale: weekSale ? weekSale : "Something went wrong",
        totalWeekSales: formattedTotalSum,
    });
})



const deleteOrder = asyncHandler(async (req, res) => {
    const { oid } = req.params
    const response = await Order.findByIdAndDelete(oid)
    return res.status(200).json({
        success: response ? true : false,
        response: response ? "Delete Order Success" : "Something went wrong"
    })
})


const cancelOrder = asyncHandler(async (req, res) => {
    const { oid } = req.params
    const order = await Order.findById(oid)

    if (!order) throw new Error("oid not found")

    order.statusOrder = "Processing"
    await order.save()

    return res.status(200).json({
        success: true,
        response: order
    });

})

const updateStatusOrder = asyncHandler(async (req, res) => {
    const { oid } = req.params
    const { statusPayment, statusOrder } = req.body
    if (!statusPayment || !statusOrder) throw new Error("Missting status")
    const response = await Order.findByIdAndUpdate(oid, { statusPayment, statusOrder }, { new: true })
    return res.status(200).json({
        success: response ? true : false,
        response: response ? response : "Something went wrong"
    })
})


const refundOrder = asyncHandler(async (req, res) => {
    const { oid } = req.params
    const order = await Order.findById(oid)

    if (!order) throw new Error("oid not found")

    order.statusOrder = "Refunded"
    order.statusPayment = "Cancelled"
    await order.save()

    return res.status(200).json({
        success: true,
        response: order
    });

})


const totalDay = asyncHandler(async (req, res) => {
    let { day } = req.query;

    if (!day) {
        day = new Date().toISOString().split('T')[0];
    }

    console.log(day);

    const startDate = new Date(day);
    const endDate = new Date(day);
    endDate.setDate(startDate.getDate() + 1);

    const orders = await Order.find({
        createdAt: {
            $gte: startDate,
            $lt: endDate
        }
    }).populate({
        path: 'postedBy',
        select: 'firstname lastname'
    });

    let totalRevenue = 0;
    const orderList = [];

    for (const order of orders) {
        totalRevenue += order.total;
        orderList.push(order);
    }

    return res.status(200).json({
        success: true,
        totalRevenue: totalRevenue.toFixed(2),
        orders: orderList
    });
});



const clientId = "AS8eoaxB80zyUZm-uhTe0575nhoK1MY6xKtsPRGiugspLyldNP4BecSrPkdc2kBgekw2zFzLc2GvPc4s";
const clientSecret = "EH66neN7Xsrh0emTOJPV8PmHRhj5LDuQ2IJ3a-Kphc0cMqeC3rAXd2k-i28hyg-oABPhhWL-ZfXnG2Vi";

// Endpoint để lấy token xác thực từ PayPal
const authEndpoint = "https://api.sandbox.paypal.com/v1/oauth2/token";




const refundPaypal = asyncHandler(async (req, res) => {
    try {
        // Lấy token xác thực từ PayPal
        const authResponse = await axios.post(authEndpoint, null, {
            auth: {
                username: clientId,
                password: clientSecret,
            },
            params: {
                grant_type: "client_credentials",
            },
        });

        const accessToken = authResponse.data.access_token;

        // Thông tin đơn hàng cần hoàn tiền
        const captureId = req.query.captureId; // ID của giao dịch bạn muốn hoàn tiền
        const amount = req.query.amount; // Số tiền bạn muốn hoàn và loại tiền tệ
        console.log(captureId);
        console.log(amount);
        // Endpoint để thực hiện hoàn tiền
        const refundEndpoint = `https://api.sandbox.paypal.com/v2/payments/captures/${captureId}/refund`;

        // Thực hiện yêu cầu hoàn tiền
        const refundResponse = await axios.post(
            refundEndpoint,
            { amount: { value: amount, currency_code: "USD" } },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        console.log("Hoàn tiền thành công: ", refundResponse.data);
        res.status(200).json({ success: true, message: "Hoàn tiền thành công" });
    } catch (error) {
        console.error("Lỗi khi thực hiện hoàn tiền: ", error);
        res.status(500).json({ success: false, message: "Lỗi khi hoàn tiền" });
    }
})


module.exports = {
    createNewOrder,
    updateStatusOrder,
    getDetailOrder,
    getUserOrder,
    getWeekSales,
    getAllOrders,
    deleteOrder,
    cancelOrder,
    refundPaypal,
    refundOrder,
    totalDay,
    revenueByDay,
    getTotalMonths
}



