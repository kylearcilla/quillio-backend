const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const { validateRegisterInput, validateLoginInput } = require('../../utils/validations');
const { verifyTokenFromHeader } = require('../../utils/authentication');
const User = require('../../models/user');
const Post = require('../../models/post');
const JWT_KEY = process.env.JWT_KEY;

// generates the token to the client slide
function generateToken(user) {
    return jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
    }, JWT_KEY, { expiresIn: '1h' });
}

async function removeElementsFromCollection(type, itemsToRemove, user, collection) {
    collection = collection.filter((e) => {
        return !itemsToRemove.includes(e.id)
    })

    if (type === "following") {
        user.following = collection;
    } else {
        user.followers = collection;
    }

    await user.save();
    return;
}
async function checkForDeletedAndRemove(type, user, collection) {
    if (collection.length === 0) {
        return;
    }
    const itemsToRemove = [];

    for (let element in collection) {
        const doesExist = await User.exists({ _id: element.id });
        !doesExist && itemsToRemove.push(element.id);
    }

    if (itemsToRemove.length === 0) {
        return;
    }

    await removeElementsFromCollection(type, itemsToRemove, user, collection);
    return;
}

module.exports = {
    Query: {
        async getUsers() {
            try {
                const users = await User.find().sort({ createdAt: -1 });
                return users;
            } catch (e) {
                throw new Error(e);
            }
        },
    },

    Mutation: {
        async register(_, { registerInput: { name, username, email, password, confirmPassword, houseName } },) {
            const { errorsObject, valid } = validateRegisterInput(name, username, password, confirmPassword, email);
            if (!valid) {
                throw new UserInputError("Errors", {
                    errors: { ...errorsObject }
                });
            }

            const user = await User.findOne({ username });
            if (user) {
                throw new UserInputError('Username is taken', {
                    errors: {
                        username: 'This username is taken'
                    }
                })
            }

            password = await bcrypt.hash(password, 12);
            const newUser = new User({
                name,
                username,
                password,
                email,
                houseName,
                createdAt: new Date().toISOString(),
                followingCount: 0,
                followerCount: 0
            })

            const res = await newUser.save();
            const token = generateToken(res);

            return {
                ...res._doc,
                id: res._id,
                token
            }

        },
        async login(_, { username, password }) {
            const { errorsObject, valid } = validateLoginInput(username, password);
            if (!valid) {
                throw new UserInputError('Errors', {
                    errors: { ...errorsObject }
                });
            }

            const user = await User.findOne({ username });
            if (!user) {
                throw new UserInputError('User does not exist', {
                    errors: {
                        username: 'User does not exist'
                    }
                })
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                throw new UserInputError('Incorrect username or password.', {
                    errors: {
                        password: 'Username or password is incorrectt.'
                    }
                })
            }

            await checkForDeletedAndRemove("following", user, user.following);
            await checkForDeletedAndRemove("followers", user, user.followers);

            user.followerCount = user.followers.length;
            user.followingCount = user.following.length;

            await user.save();

            const token = generateToken(user);

            return {
                ...user._doc,
                id: user.id,
                token
            }
        },
        async getUser(_, { userId }) {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error("User not found.");
            }

            // this resolver is used everytime a user navigates to another or his/her own profile page
            // the user data must be up to date, meaning that if a follower no longer exists, this must be reflected in data
            // since followers and following are stored as refrences & not actual docs, they need to be deleted manually
            await checkForDeletedAndRemove("following", user, user.following);
            await checkForDeletedAndRemove("followers", user, user.followers);

            user.followerCount = user.followers.length;
            user.followingCount = user.following.length;

            await user.save();
            return user;
        },
        async followClicked(_, { userId }, context) {
            const { id } = verifyTokenFromHeader(context);;

            const user = await User.findById(id);
            const otherUser = await User.findById(userId);

            if (!otherUser) {
                throw new Error("Cannot find that user.")
            }
            if (user.username === otherUser.username) {
                throw new Error("Cannot follow yourself.")
            }

            const otherUserIndex = user.following.findIndex(person => (person.username === otherUser.username));
            const userIndex = otherUser.followers.findIndex(person => (person.username === user.username));

            if (otherUserIndex >= 0) {
                user.following.splice(otherUserIndex, 1);
                otherUser.followers.splice(userIndex, 1);

                user.followingCount--;
                otherUser.followerCount--;

            } else {
                user.following.push({
                    name: otherUser.name,
                    username: otherUser.username,
                    houseName: otherUser.houseName,
                    profileImageURL: otherUser.profileImageURL,
                    bio: otherUser.bio,
                    id: otherUser.id
                });

                otherUser.followers.push({
                    name: user.name,
                    username: user.username,
                    houseName: user.houseName,
                    profileImageURL: user.profileImageURL,
                    bio: user.bio,
                    id
                });

                user.followingCount++;
                otherUser.followerCount++;
            };

            await user.save();
            await otherUser.save();
            return user;
        },
        async deleteUser(_, __, context) {
            const { username } = verifyTokenFromHeader(context);

            const user = await User.findOne({ username });

            // delete instances of the deleted user from post's likes, dislikes...
            // ...and user's following or followers
            // ...comment deletions are handled when getPost for that post is called

            await Post.deleteMany({ user: user.id });
            const posts = await Post.find({
                $or: [{ 'likes.username': username }, { 'dislikes.username': username }]
            });

            const users = await User.find({
                $or: [{ 'followers.username': username }, { 'following.username': username }]
            })

            // updates: the likeCount, likes, dislikeCount, dislike, commentCount
            // removes each instance of the user from each post
            // removal of comments, comment likes, comment dislikes, is handled in getPost
            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];
                const likeIndex = post.likes.findIndex((l) => (l.username === username));
                const dislikeIndex = post.dislikes.findIndex((d) => (d.username === username));
                const commentIndex = post.comments.findIndex((c) => (c.username === username));

                if (likeIndex >= 0) {
                    post.likes.splice(likeIndex, 1);
                    post.likeCount--;
                }
                if (dislikeIndex >= 0) {
                    post.dislikes.splice(dislikeIndex, 1);
                    post.dislikeCount--;
                }
                if (commentIndex >= 0) {
                    post.commentCount--;
                }

                await post.save();
            }

            // remove instances of deleted user from users' following and follower
            for (let i = 0; i < users.length; i++) {
                const thisUser = users[i];
                const followingIndex = thisUser.following.findIndex((f) => (f.username === username));
                const followerIndex = thisUser.followers.findIndex((f) => (f.username === username));

                if (followingIndex >= 0) {
                    thisUser.following.splice(followingIndex, 1);
                    thisUser.followingCount--;
                }
                if (followerIndex >= 0) {
                    thisUser.followers.splice(followerIndex, 1);
                    thisUser.followerCount--;
                }

                await thisUser.save();
            }

            await user.delete();
            return "User successfully deleted.";
        },
    }
}