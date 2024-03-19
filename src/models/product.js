const mongoose = require('mongoose');

var productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    description: {
        type: Array,
        required: true,
    },
    brand: {
        type: mongoose.Types.ObjectId,
        ref: "Brand"
    },
    price: {
        type: Number,
        required: true
    },
    category: {
        type: mongoose.Types.ObjectId,
        ref: "ProductCategory"
    },

    quantity: {
        type: Number,
        default: 0
    },
    sold: {
        type: Number,
        default: 0
    },
    avatar: {
        type: String,
        default: ""
    },
    images: {
        type: Array
    },
    isHidden: {
        type: Boolean,
        default: false,
    },
    ratings: [
        {
            star: { type: Number },
            postedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
            comment: { type: String },
            updatedAt: { type: Date, }
        }
    ],
    totalRatings: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

//Export the model
module.exports = mongoose.model('Product', productSchema);