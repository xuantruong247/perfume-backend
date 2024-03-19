const mongoose = require('mongoose');

var orderSchema = new mongoose.Schema({
    products: [{
        product: { type: mongoose.Types.ObjectId, ref: "Product" },
        quantity: Number,
        price: Number,
        avatar: String,
        title: String,
    }],
    statusPayment: {
        type: String,
        default: "Succeed",
        enum: ['Cancelled', "Succeed"]
    },
    statusOrder: {
        type: String,
        default: "Preparing the order",
        enum: ["Preparing the order", "The order has been shipped", "The delivery person is delivering to you", "Received goods successfully", "Refunded", "Processing", "Cancelled"],
    },

    total: {
        type: Number,
    },
    postedBy: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    }

},
    {
        timestamps: true
    });

module.exports = mongoose.model('Order', orderSchema);