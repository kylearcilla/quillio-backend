// GraphQL Schemas
const { gql } = require('apollo-server');

// every attribute here is needed to be fetched to show the UI
module.exports = gql`
type Like {
    username: String!
}

type Dislike {
    username: String!
}

type Comment {
    id: ID!
    userInfo: UserDetail
    createdAt: String!
    body: String!
    likes: [Like]
    dislikes: [Dislike]
    likeCount: Int!
    dislikeCount: Int!
}

type FollowUser {
    id: ID!,
    name: String!
    username: String!,
    houseName: String,
    profileImageURL: String, 
    bio: String
}

type UserDetail {
    userId: ID,
    name: String!,
    username: String!,
    houseName: String,
    profileImageURL: String
    bio: String
}

type Post {
    id: ID!
    userInfo: UserDetail!
    body: String!
    imageURL: String
    createdAt: String!
    likes: [Like]
    dislikes: [Dislike]
    comments: [Comment]
    likeCount: Int!
    dislikeCount: Int!
    commentCount: Int!
}

type User {
    id: ID!
    profileImageURL: String, 
    email: String!
    token: String
    name: String!
    houseName: String
    location: String
    username: String!
    createdAt: String!
    bio: String
    bannerURL: String
    following: [FollowUser]
    followers: [FollowUser]
    followerCount: Int!
    followingCount: Int!
}

# input type
input RegisterInput {
    name: String!
    username: String!
    password: String!
    confirmPassword: String!
    email: String!
}

input EditProfileInput {
    houseName: String
    location: String
    bio: String
    profileImageURL: String
    bannerURL: String
}

type Query {
    getPosts: [Post!]
    getUsers: [User]
    getUserLikedPosts(userId: ID!): [Post]!
    getUserPosts(userId: ID!): [Post]!
    getPost(postId: ID!): Post!
    getFollowingPosts: [Post]!
}

type Mutation {
    # using the application
    register(registerInput: RegisterInput): User!
    login(username: String!, password: String!): User!
    followClicked(userId: ID!): User!
    deleteUser: String!

    # for navigating to a user's profile/post & do needed updates
    getUser(userId: ID!): User!

    # posts
    createPost(body: String!, imageURL: String): Post!
    deletePost(postId: ID!): String!
    likePost(postId: ID!): Post!
    dislikePost(postId: ID!): Post!

    # comments
    createComment(postId: ID!, body: String!): Post!
    deleteComment(postId: ID!, commentId: ID!): Post!
    likeComment(postId: ID!, commentId: ID!): Post!
    dislikeComment(postId: ID!, commentId: ID!): Post!

    # profile
    updateProfileDetails(editProfileInput: EditProfileInput): User!
}
`