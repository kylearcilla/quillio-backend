const { model, Schema } = require("mongoose");

const postSchema = new Schema({
    userInfo: {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'users'
        },
        name: String,
        username: String,
        houseName: String,
        profileImageURL: String
    },
    body: String,
    imageURL: String,
    createdAt: String,
    house: String,
    comments: [
        {
            body: String,
            createdAt: String,
            userInfo: {
                userId: {
                    type: Schema.Types.ObjectId,
                    ref: 'users'
                },
                name: String,
                username: String,
                profileImageURL: String,
                houseName: String
            },
            likes: [
                {
                    username: String
                }
            ],
            dislikes: [
                {
                    username: String
                }
            ],
            likeCount: Number,
            dislikeCount: Number,
        }
    ],
    likes: [
        {
            username: String,
        }
    ],
    dislikes: [
        {
            username: String,
        }
    ],
    likeCount: Number,
    dislikeCount: Number,
    commentCount: Number,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'users'
    }
})

module.exports = model('Post', postSchema);