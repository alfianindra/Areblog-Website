const mongoose = require('mongoose');
const User = require('./User');

const Schema = mongoose.Schema;
const CommentSchema = new Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post', // Referensi ke model Post
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId, // Mengacu pada ObjectId
    ref: 'User', // Mengacu pada model User
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

CommentSchema.statics.getCommentsWithUser = async function () {
  try {
    const comments = await this.find().populate('createdBy', 'username'); // Populate username dari model User
    return comments;
  } catch (error) {
    throw new Error('Error fetching comments with user');
  }
};

module.exports = mongoose.model('Comment', CommentSchema);