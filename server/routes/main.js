const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment')


const LoginLayout = '../views/layouts/login';
const mainLayout = '../views/layouts/main';

const authComment = async (req, res, next) => {
  try {
    const { user } = req.session;
    if (!user) {
      return res.redirect('/admin');
    }

    const userData = await User.findById(user);
    if (!userData) {
      return res.status(401).json({ message: 'User data not found' });
    }

    req.user = userData; // Attach user object to request for future use
    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * GET /
 * HOME
*/
router.get('', async (req, res) => {
  try {
    let perPage = 5;
    let page = req.query.page || 1;
    let sort = req.query.sort || 'latest'; 
    let category = req.query.category || 'all'; 

    let filter = {};
    if (category !== 'all') {
      filter = { category: category };
    }

    // Lakukan sorting pada tingkat database menggunakan aggregation
    let sortCriteria = {};
    if (sort === 'latest') {
      sortCriteria = { $sort: { createdAt: -1 } };
    } else if (sort === 'oldest') {
      sortCriteria = { $sort: { createdAt: 1 } };
    } else if (sort === 'a-to-z') {
      sortCriteria = { $sort: { title: 1 } };
    } else if (sort === 'z-to-a') {
      sortCriteria = { $sort: { title: -1 } };
    }

    // Pipeline aggregation untuk filter dan sort
    let pipeline = [
      { $match: filter },
      sortCriteria,
      { $skip: (page - 1) * perPage },
      { $limit: perPage }
    ];

    // Execute aggregation
    const data = await Post.aggregate(pipeline);

    // Hitung total data yang cocok dengan filter
    const countPipeline = [
      { $match: filter },
      { $count: "count" }
    ];
    const [{ count }] = await Post.aggregate(countPipeline);
    const hasNextPage = page < Math.ceil(count / perPage);

    res.render('index', { 
      data,
      current: page,
      nextPage: hasNextPage ? parseInt(page) + 1 : null,
      previousPage: page > 1 ? parseInt(page) - 1 : null,
      currentRoute: '/',
      selectedSort: sort,
      selectedCategory: category,
      user: req.session.user,
    });

  } catch (error) {
    console.log(error);
  }

});

// router.get('', async (req, res) => {
//   const locals = {
//     title: "NodeJs Blog",
//     description: "Simple Blog created with NodeJs, Express & MongoDb."
//   }

//   try {
//     const data = await Post.find();
//     res.render('index', { locals, data });
//   } catch (error) {
//     console.log(error);
//   }

// });


/**
 * GET /
 * Post :id
*/
router.get('/post/:id', async (req, res) => {
  try {
    let slug = req.params.id;

    // Fetch the post data
    const postData = await Post.findById({ _id: slug });

    // Fetch comments associated with the post and populate createdBy field to get username
    const comments = await Comment.find({ postId: slug }).populate('createdBy', 'username');

    const locals = {
      title: postData.title,
      description: "Simple Blog created with NodeJs, Express & MongoDb.",
    }

    res.render('post', { 
      user : req.session.user,
      layout: mainLayout, 
      postData,
      comments, // Pass comments data to the view
      currentRoute: `/post/${slug}`,

    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * POST /
 * Post - searchTerm
*/
router.post('/search', async (req, res) => {
  try {
    const locals = {
      title: "Seach",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }

    let searchTerm = req.body.searchTerm;
    const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "")

    const data = await Post.find({
      $or: [
        { title: { $regex: new RegExp(searchNoSpecialChar, 'i') }},
        { body: { $regex: new RegExp(searchNoSpecialChar, 'i') }}
      ]
    });

    res.render("search", {
      data,
      currentRoute: '/',
      layout: LoginLayout
    });

  } catch (error) {
    console.log(error);
  }

});


/**
 * GET /
 * About
*/
router.get('/about', (req, res) => {
  res.render('about', {
    currentRoute: '/about',
    user : req.session.user,
    layout: mainLayout
  });
});

/**
 * GET /comments
 * Get all comments
*/
router.get('/comments/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const comments = await Comment.find({ postId });
    res.render('comments', { comments }); // Render view and pass comments data
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).send('Internal server error');
  }
});


/**
 * POST /comments
 * Create a new comment
 * Requires authentication
*/
router.post('/add-comments', authComment, async (req, res) => {
  try {
    const { postId, text } = req.body;

    // Pastikan postId, text, dan command tidak kosong atau undefined
    
    if (!postId ) {
      return res.status(400).json({ message: 'postId, text, and command are required' });
    }
    if (!text ) {
      return res.status(400).json({ message: ' text, are required' });
    } 
    
    const createdBy = req.user._id; // Mengambil ID pengguna dari objek User

    const newComment = new Comment({
      postId,
      text,
      createdBy,
    });

    await newComment.save();
    res.redirect('back');
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(400).json({ message: 'Bad request', error: error.message });
  }
});

// PUT route for updating a comment by ID
router.put('/update-comments/:id', authComment, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if the logged-in user is the creator of the comment
    if (comment.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to edit this comment' });
    }

    comment.text = text;
    comment.updatedAt = new Date();
    await comment.save();

    res.redirect('back');
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(400).json({ message: 'Bad request' });
  }
});



// DELETE route for deleting comment
router.delete('/delete-comments/:id', authComment, async (req, res) => {
  try {
    const { id } = req.params;


    const comment = await Comment.findById(id);
    // if (!comment) {
    //   return res.status(404).json({ message: 'Comment not found' });
    // }

    // Check if the logged-in user is the creator of the comment
    if (comment.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to delete this comment' });
    }

    await Comment.deleteOne({ _id: id }); // Use Comment.deleteOne() to delete the comment

    res.redirect('back')
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(400).json({ message: 'Bad request' });
  }
});




module.exports = router;
