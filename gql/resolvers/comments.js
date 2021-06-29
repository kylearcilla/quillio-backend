const { AuthenticationError, UserInputError } = require('apollo-server');

const Post = require('../../models/post');
const User = require('../../models/user');
const { verifyTokenFromHeader } = require('../../utils/authentication');

// find the index of a like or a dislike in a comment
function findIndexInComment(type, comments, commentId, identifier) {
    return type === "likes" ? comments[commentId].likes.findIndex((l) => (l.username === identifier)) :
        comments[commentId].dislikes.findIndex((d) => (d.username === identifier));
}

module.exports = {
    Mutation: {
        async createComment(_, { postId, body }, context) {
            const { id } = verifyTokenFromHeader(context);

            if (body == null || body.length === 0) {
                throw new UserInputError("Comment must not be empty.");
            }

            const post = await Post.findById(postId);
            const user = await User.findById(id);
            if (!post) {
                throw new Error("Post does not exist.");
            }

            post.commentCount++;
            post.comments.unshift({
                body,
                userInfo: {
                    userId: user.id,
                    name: user.name,
                    username: user.username,
                    profileImageURL: user.profileImageURL,
                    houseName: user.houseName
                },
                createdAt: new Date().toISOString(),
                likeCount: 0,
                dislikeCount: 0
            });

            await post.save()
            return post;
        },
        async deleteComment(_, { postId, commentId }, context) {
            const { username } = verifyTokenFromHeader(context);
            const post = await Post.findById(postId);

            if (!post) {
                throw new Error("Post does not exist.");
            }

            const commentIndex = post.comments.findIndex((c) => (c.id === commentId));
            if (commentIndex < 0) {
                throw new Error("Comment does not exist.");
            }

            const comment = post.comments[commentIndex];
            // users can delete comments on their posts, but not on others
            if (post.userInfo.username !== username && comment.userInfo.username !== username) {
                throw new AuthenticationError("Cannot delete someone else's comment.");
            }

            post.comments = post.comments.filter((c) => c.id !== commentId);
            post.commentCount--;

            await post.save();
            return post;
        },
        async likeComment(_, { postId, commentId }, context) {
            const { username } = verifyTokenFromHeader(context);

            const post = await Post.findById(postId);
            if (!post) {
                throw new Error("Post does not exist.");
            }

            const commentIndex = post.comments.findIndex((c) => (c.id === commentId));
            if (commentIndex < 0) {
                throw new Error("Comment does not exist.");
            }
            const likeIndex = findIndexInComment("likes", post.comments, commentIndex, username);

            // if liked already, then unlike
            // if unlike but disliked, remove the dislike, then like
            if (likeIndex >= 0) {
                post.comments[commentIndex].likes.splice(likeIndex, 1);
                post.comments[commentIndex].likeCount--;

            } else {
                post.comments[commentIndex].likes.push({ username });
                post.comments[commentIndex].likeCount++;

                const dislikeIndex = findIndexInComment("dislikes", post.comments, commentIndex, username);
                if (dislikeIndex >= 0) {
                    post.comments[commentIndex].dislikes.splice(dislikeIndex, 1);
                    post.comments[commentIndex].dislikeCount--;
                }
            }

            await post.save();
            return post;
        },
        async dislikeComment(_, { postId, commentId }, context) {
            const { username } = verifyTokenFromHeader(context);

            const post = await Post.findById(postId);
            if (!post) {
                throw new Error("Post does not exist.");
            }

            const commentIndex = post.comments.findIndex((c) => (c.id === commentId));
            if (commentIndex < 0) {
                throw new Error("Comment does not exist.");
            }
            const dislikeIndex = findIndexInComment("dislikes", post.comments, commentIndex, username);

            // if disliked already, then undisliked
            // if undisliked but liked, remove the like, then dislike
            if (dislikeIndex >= 0) {
                post.comments[commentIndex].dislikes.splice(dislikeIndex, 1);
                post.comments[commentIndex].dislikeCount--;

            } else {
                const likeIndex = findIndexInComment("likes", post.comments, commentIndex, username);
                post.comments[commentIndex].dislikes.push({ username });
                post.comments[commentIndex].dislikeCount++;

                if (likeIndex >= 0) {
                    post.comments[commentIndex].likes.splice(likeIndex, 1);
                    post.comments[commentIndex].likeCount--;
                }
            }

            await post.save();
            return post;
        }
    }
}