const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User')



// Get Menu Home
router.get('', async (req, res) => {
  try {

    let perPage = 10;
    let page = req.query.page || 1;

    const data = await Post.aggregate([ { $sort: { createdAt: -1 } } ])
    .skip(perPage * page - perPage)
    .limit(perPage)
    .exec();

    const count = await Post.countDocuments({});
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    res.render('index', { 
      data,
      current: page,
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: '/',
      user: req.session.user, //memasukan user dari session
    });

  } catch (error) {
    console.log(error);
  }

});



//Method Get Post:id
router.get('/post/:id', async (req, res) => {
  try {
    let slug = req.params.id;

    const data = await Post.findById({ _id: slug });

    res.render('post', { 
      data,
      currentRoute: `/post/${slug}`,
      user: req.session.user,
    });
  } catch (error) {
    console.log(error);
  }

});


// Post Untuk Fitur Search
router.post('/search', async (req, res) => {
  try {

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
      user: req.session.user,
    });

  } catch (error) {
    console.log(error);
  }

});


// Method Get Pada tab About
router.get('/about', (req, res) => {
  res.render('about', {
    currentRoute: '/about',
    user: req.session.user // memasukan data session
  });
});



module.exports = router;
