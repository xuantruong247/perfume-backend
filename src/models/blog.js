const mongoose = require('mongoose');

var blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: Array,
        required: true,
    },
    numberViews: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Types.ObjectId,
        ref: "User"
    }],
    dislikes: [{
        type: mongoose.Types.ObjectId,
        ref: "User"
    }],
    imageThum: {
        type: String,
        default: ""
    },
    author: {
        type: String,
        default: 'Admin'
    }
},
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

module.exports = mongoose.model('Blog', blogSchema);