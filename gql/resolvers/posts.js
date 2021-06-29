const { AuthenticationError, UserInputError } = require('apollo-server');
const Post = require('../../models/post');
const User = require('../../models/user');
const { verifyTokenFromHeader } = require('../../utils/authentication');


function findIndexByUsername(array, property, identifier) {
    return property === "username" ? array.findIndex((e) => (e.username) === identifier) :
        array.findIndex((e) => (e.postId) === identifier);
}
// remove non-existing entities from collection
async function removeElementsFromCollection(type, post, comments, toBeRemoved, commentsWithDeleted) {
    if (type === "comments") {
        const newComments = comments.filter((c) => {
            return !toBeRemoved.includes(c.userInfo.username);
        });
        post.comments = newComments;
        post.commentCount = newComments.length;
    }

    if ("likes") {
        for (let i = 0; i < comments.length; i++) {
            if (!commentsWithDeleted.includes(comments[i].username)) { continue; }

            comments[i].likes = comments[i].likes.filter((l) => {
                toBeRemoved.includes(l.username);
                return !toBeRemoved.includes(l.username)
            })
            post.comments[i].likes = comments[i].likes;
            post.comments[i].likeCount = comments[i].likes.length;
        }
    }

    if ("dislikes") {
        for (let i = 0; i < comments.length; i++) {
            if (!commentsWithDeleted.includes(comments[i].username)) { continue; }

            comments[i].dislikes = comments[i].dislikes.filter((d) => {
                toBeRemoved.includes(d.username);
                return !toBeRemoved.includes(d.username);
            })
            post.comments[i].dislikes = comments[i].dislikes;
            post.comments[i].dislikeCount = comments[i].dislikes.length;
        }
    }

    // post comment, like, dislike counts are updated in the deleteUser resolver...
    // ...this is because, comment, like, and dislike counts are displayed in PostView as well
    // ...posts in posts list view, must always be updated

    return await post.save();
}
// check for non-existing entities from collection
async function checkForDeletedAndRemove(post, comments, type) {
    if (comments.length === 0) { return; }
    let itemsToRemove = [];
    let commentLikesDislikesToRemove = [];  // the usernames of likes/dislikes that were deleleted
    let commentsWithDeleted = [];  // the comments that have deleted users' likes and dislikes

    if (type === "comments") {
        for (let comment of comments) {
            const username = comment.userInfo.username;
            const user = await User.findOne({ username });
            // get deleted users' comments in array to be deleted
            if (!user) {
                itemsToRemove.push(username);
            } else {
                // update comments with updated user data
                comment.userInfo.username = user.username;
                comment.userInfo.profileImageURL = user.profileImageURL;
                comment.userInfo.houseName = user.houseName;
            }
        }
        post.comments = comments;
        await post.save();
    }
    if (type === "likes") {
        for (let comment of comments) {
            for (let like of comment.likes) {
                const username = like.username;
                const doesExist = await User.exists({ username });

                !doesExist && commentsWithDeleted.push(comment.username);
                !doesExist && commentLikesDislikesToRemove.push(username);
            }
        }
    }
    if (type === "dislikes") {
        for (let comment of comments) {
            for (let dislike of comment.dislikes) {
                const username = dislike.username;
                const doesExist = await User.exists({ username });

                !doesExist && commentsWithDeleted.push(comment.username);
                !doesExist && commentLikesDislikesToRemove.push(username);
            }
        }
    }

    if (itemsToRemove.length === 0 && commentLikesDislikesToRemove.length === 0) {
        return;
    }

    await removeElementsFromCollection(
        type, post,
        comments,
        type === "comments" ? itemsToRemove : commentLikesDislikesToRemove,
        commentsWithDeleted
    );
    return;
}

module.exports = {
    Query: {
        async getPosts() {
            try {
                const posts = await Post.find().sort({ createdAt: -1 });

                // make sure post reflect updates on user
                for (let post of posts) {
                    const postUser = await User.findById(post.user);
                    const thisPost = await Post.findById(post.id);
                    const userInfo = {
                        name: postUser.name,
                        username: postUser.username,
                        houseName: postUser.houseName,
                        profileImageURL: postUser.profileImageURL
                    }
                    thisPost.userInfo = { ...thisPost.userInfo, ...userInfo };
                    await thisPost.save();
                }

                const updatedPosts = await Post.find().sort({ createdAt: -1 });
                return updatedPosts;

            } catch (e) {
                throw new Error(e);
            }
        },
        async getPost(_, { postId }) {
            const post = await Post.findById(postId);
            if (!post) {
                throw new Error("Post not found");
            }

            // posts must be alway up to date so... 
            // comments, likes, and dislikes of users that no longer exists must be deleted
            // this functionality is used when a user navigates to a post page, and not in posts view...
            // ...to make displaying posts faster

            await checkForDeletedAndRemove(post, post.comments, "comments");
            await checkForDeletedAndRemove(post, post.comments, "likes");
            await checkForDeletedAndRemove(post, post.comments, "dislikes");

            return post;
        },
        async getFollowingPosts(_, __, context) {
            const { id } = verifyTokenFromHeader(context);
            const user = await User.findById(id);

            const usernames = user.following.map((f) => (f.username));
            usernames.push(user.username);
            const posts = await Post.find({ 'userInfo.username': { $in: usernames } });
            return posts.reverse();
        }
    },

    Mutation: {
        async createPost(_, { body, imageURL }, context) {
            // imageURL is the url of the image in Cloudinary, it's uploaded their first
            const { id: userId } = verifyTokenFromHeader(context);
            const user = await User.findById(userId);

            if (body.trim() === '') {
                throw new UserInputError("Error", {
                    errors: {
                        body: "Post must not be Empty"
                    }
                });
            }

            const newPost = new Post({
                userInfo: {
                    userId,
                    name: user.name,
                    username: user.username,
                    houseName: user.houseName,
                    profileImageURL: user.profileImageURL
                },
                imageURL,
                body,
                user: user.id,
                createdAt: new Date().toISOString(),
                likeCount: 0,
                dislikeCount: 0,
                commentCount: 0
            })

            const post = await newPost.save();

            return {
                ...post._doc,
                id: post.id
            }
        },
        async deletePost(_, { postId }, context) {
            const { username } = verifyTokenFromHeader(context);

            const post = await Post.findById(postId);
            if (!post) {
                throw new Error("Post not found");
            }

            if (post.userInfo.username !== username) {
                throw new AuthenticationError("Action is not allowed");
            }

            await post.delete();
            return "Post deleted successfully";
        },
        async likePost(_, { postId }, context) {
            const { username } = verifyTokenFromHeader(context);

            const post = await Post.findById(postId);
            if (!post) {
                throw new Error("Post does not exist.");
            }

            if (post.username === username) {
                throw new Error("Cannot like your own post.");
            }

            const likeIndex = findIndexByUsername(post.likes, "username", username);

            // if liked already, then unlike
            // if unlike but disliked, remove the dislike, then like
            if (likeIndex >= 0) {
                post.likes.splice(likeIndex, 1);
                post.likeCount--;

            } else {
                post.likes.push({ username })
                post.likeCount++;

                const dislikeIndex = findIndexByUsername(post.dislikes, "username", username);
                if (dislikeIndex >= 0) {
                    post.dislikes.splice(dislikeIndex, 1);
                    post.dislikeCount--;
                }
            }

            await post.save();
            return post;
        },
        async dislikePost(_, { postId }, context) {
            const { username } = verifyTokenFromHeader(context);

            const post = await Post.findById(postId);

            if (!post) {
                throw new Error("Post does not exist.");
            }

            if (post.username === username) {
                throw new Error("Cannot dislike own post.");
            }

            const dislikeIndex = findIndexByUsername(post.dislikes, "username", username);

            // if disliked already, then undisliked
            // if undisliked but liked, remove the like, then dislike
            if (dislikeIndex >= 0) {
                post.dislikes.splice(dislikeIndex, 1);
                post.dislikeCount--;

            } else {
                post.dislikes.push({ username })
                post.dislikeCount++;

                const likeIndex = findIndexByUsername(post.likes, "username", username);
                if (likeIndex >= 0) {
                    post.likes.splice(likeIndex, 1);
                    post.likeCount--;
                }
            }

            await post.save();
            return post;
        }
    }
}