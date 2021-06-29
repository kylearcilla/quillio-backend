const { verifyTokenFromHeader } = require('../../utils/authentication');
const User = require("../../models/user");
const Post = require("../../models/post");

module.exports = {
    Query: {
        async getUserLikedPosts(_, { userId }) {
            const { username } = await User.findById(userId);

            try {
                const posts = await Post.find({ "likes.username": `${username}` });
                return posts.reverse();

            } catch {
                throw new Error("Couldn't pull up user's liked posts. ");
            }
        },
        async getUserPosts(_, { userId }) {
            try {
                const posts = await Post.find({ "user": `${userId}` });
                return posts.reverse();
            } catch {
                throw new Error("Couldn't oull up user's liked posts. ");
            }
        }
    },
    Mutation: {
        async updateProfileDetails(_, { editProfileInput: {
            houseName, location, bio, profileImageURL, bannerURL
        } }, context) {
            const { id } = verifyTokenFromHeader(context);
            const user = await User.findById(id);

            if (houseName != null && houseName !== "") {
                user.houseName = houseName;
            }

            if (location != null && location !== "") {
                user.location = location;
            }

            if (bio != null && bio !== "") {
                user.bio = bio;
            }

            if (profileImageURL != null && profileImageURL !== "")
                user.profileImageURL = profileImageURL;

            if (bannerURL != null && bannerURL !== "")
                user.bannerURL = bannerURL;

            await user.save();
            return user;
        }
    }
}
