const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const { title } = require('process');


const mainLayout = '../views/layouts/login';
const adminLayout = '../views/layouts/admin';
const jwtSecret = process.env.JWT_SECRET;


/**
 * 
 * Check Login
*/
const authMiddleware = (req, res, next ) => {
  const token = req.cookies.token;

  if(!token) {
    return res.redirect('/error')
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch(error) {
    return res.redirect('/error')
  }
}

/**
 * GET /
 * Admin - Login Page
*/
router.get('/admin', async (req, res) => {
  try {
    const locals = {
      title: 'Login',
    };
    res.render('admin/index', {layout: mainLayout , locals});
  } catch (error) {
    console.log(error);
  }
});


/**
 * POST /
 * Admin - Check Login
*/
/**
 * POST /
 * Admin - Check Login
*/
router.post('/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });

    // Periksa apakah pengguna ditemukan
    if (!user) {
      req.flash('error', 'Username salah');
      return res.redirect('/admin');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      req.flash('error', 'password salah');
      return res.redirect('/admin');;
    }

    if (user.role === 'admin') {
      const token = jwt.sign({ userId: user._id }, jwtSecret);
      res.cookie('token', token, { httpOnly: true });
      req.session.user = user;
      return res.redirect('/dashboard');
    } else {
      req.session.user = user;
      const token2 = jwt.sign({ userId: user._id }, jwtSecret);
      res.cookie('token', token2, { httpOnly: true });
      // Jika bukan admin, arahkan ke halaman beranda
      return res.redirect('/');
    }

  } catch (error) {
    console.log(error);
  }
});

/**
 * GET /
 * Admin Dashboard
*/
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    // Memeriksa peran pengguna
    if (!user || user.role !== 'admin') {
      return res.redirect('/error')
    }

    const locals = {
      title: 'Dashboard',
    };

    const data = await Post.find();
    res.render('admin/dashboard', {
      user : req.session.user,
      locals,
      data,
      layout: adminLayout
    });

  } catch (error) {
    console.log(error);
  }

});


/**
 * GET /
 * Admin - Create New Post
*/
router.get('/add-post', authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: 'Add Post',
    };

    const data = await Post.find();
    res.render('admin/add-post', {
      locals,
      user: req.session.user,
      layout: adminLayout
    });

  } catch (error) {
    console.log(error);
  }

});

// Image upload configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, './public/uploads');
  },
  filename: function(req, file, cb) {
      cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage }).single("image");

/**
 * POST /
 * Admin - Create New Post
*/
router.post('/add-post', authMiddleware , upload, async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    const newPost = new Post({
      title: req.body.title,
      image: req.file.filename,
      body: req.body.body,
      category: req.body.category 
    });

    await newPost.save();
    res.redirect('/dashboard');
  } catch (error) {
    console.log(error);
    res.redirect('/error')
  }
});


/**
 * GET /
 * Admin - Create New Post
*/
router.get('/edit-post/:id', authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: 'Edit Post',
    };

    const data = await Post.findOne({ _id: req.params.id });

    res.render('admin/edit-post', {
      locals,
      user: req.session.user,
      data,
      layout: adminLayout
    })

  } catch (error) {
    console.log(error);
  }

});


/**
 * PUT /
 * Admin - Create New Post
*/
router.put('/edit-post/:id', authMiddleware,upload, async (req, res) => {
  try {
    let id = req.params.id;
    let new_image = '';

    if (req.file) {
      new_image = req.file.filename;
      try {
        fs.unlinkSync('../uploads/' + req.body.old_image);
      } catch (err) {
        console.log(err);
      }
    } else {
      new_image = req.body.old_image;
    }

    await Post.findByIdAndUpdate(id, {
      user: req.session.user,
      title: req.body.title,
      image: new_image,
      body: req.body.body,
      category: req.body.category,
      updatedAt: Date.now()
    });

    req.session.message = {
      type: 'success',
      message: 'Post updated successfully!',
    };
    res.redirect(`/dashboard`);

  } catch (error) {
    console.log(error);
    res.json({ message: error.message, type: 'danger' });
  }
});

router.get('/register', (req,res) => {
  const locals = {
    title: 'Register',
  }
  res.render('admin/register', {
    user: req.session.user,
    locals,
    layout: adminLayout
  })
})

/**
 * POST /
 * Admin - Register
*/
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await User.create({ username, password:hashedPassword });
      res.flash('success', 'User dibuat')
      setTimeout(function() {
        res.redirect('/admin'); 
      }, 3000);
    } catch (error) {
      if(error.code === 11000) {
        req.flash('error', 'Username sudah dipakai');
      }
      res.redirect('/register')
    }

  } catch (error) {
    console.log(error);
  }
});


/**
 * DELETE /
 * Admin - Delete Post
*/
router.delete('/delete-post/:id', authMiddleware, async (req, res) => {

  try {
    await Post.deleteOne( { _id: req.params.id } );
    res.redirect('/dashboard');
  } catch (error) {
    console.log(error);
  }

});


/**
 * GET /
 * Admin Logout
*/
router.get('/logout', (req, res) => {
  req.session.destroy(); // Clear the session data
  res.clearCookie('token'); // Clear the token cookie
  res.redirect('/');
});




module.exports = router;