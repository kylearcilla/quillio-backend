const { model, Schema } = require('mongoose');

const userSchema = new Schema({
    name: String,
    username: String,
    password: String,
    email: String,
    houseName: String,
    createdAt: String,
    bio: String,
    profileImageURL: String,
    location: String,
    bannerURL: String,
    following: [
        {
            name: String,
            username: String,
            houseName: String,
            profileImageURL: String,
            bio: String,
            id: {
                type: Schema.Types.ObjectId,
                ref: 'users'
            }
        }
    ],
    followers: [
        {
            name: String,
            username: String,
            houseName: String,
            profileImageURL: String,
            bio: String,
            id: {
                type: Schema.Types.ObjectId,
                ref: 'users'
            }
        }
    ],
    followerCount: Number,
    followingCount: Number
});

module.exports = model('User', userSchema);

