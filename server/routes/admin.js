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

// JWT cek login
const authMiddleware = (req, res, next) => {
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

//Get dari Menu Login
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



//mengecek login
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

//Get Menu dashboard
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
    res.redirect('/error');
  }

});


//GET post yang dibuat
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
  destination: function (req, file, cb) {
    cb(null, 'public/uploads');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage }).single("image");

// POST create Post
router.post('/add-post', authMiddleware, upload, async (req, res) => {
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

// Get dari Post
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

// put untuk Post
router.put('/edit-post/:id', authMiddleware,upload, async (req, res) => {
  try {
    let id = req.params.id;
    let new_image = '';

    if (req.file) {
      new_image = req.file.filename;
      try {
        fs.unlinkSync(path.join(__dirname, '../public/uploads/', req.body.old_image));
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
      image: new_image,
      body: req.body.body,
      category: req.body.category,
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
    res.redirect('/error');
  }
});

// get untuk register
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

// Post Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cek apakah username sudah ada dalam database
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash('error', 'Username telah dipakai');
      return res.redirect('register'); // Ganti dengan path menuju halaman registrasi
    }
    
    try {
      const role = 'user';
      const user = await User.create({ username, password: hashedPassword, role });
      req.session.user = user; // Set req.session.user saat pengguna berhasil mendaftar
      const token2 = jwt.sign({ userId: user._id }, jwtSecret);
      res.cookie('token', token2, { httpOnly: true });
      res.redirect('/admin');
    } catch (error) {
      res.redirect('/error')
    }

  } catch (error) {
    res.redirect('/error');
  }
});


// Delete Post
router.delete('/delete-post/:id', authMiddleware, async (req, res) => {

  try {
    await Post.deleteOne({ _id: req.params.id });
    res.redirect('/dashboard');
  } catch (error) {
    console.log(error);
  }

});


// Get Logout 
  router.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      // Redirect ke halaman login atau halaman sebelumnya (jika ada)
      res.redirect('/');
    });
  });
  
  // Route untuk halaman profile
  router.get('/profile', authMiddleware, async (req, res) => {
    try {
      const user = await User.findById(req.userId);
      res.render('profile', { 
        user,
        currentRoute: '/profile', // tambahkan currentRoute ke dalam objek yang akan dirrender
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Post untuk ganti username
  router.post('/update-username', authMiddleware, async (req, res) => {
    try {
      const { newUsername } = req.body;
      const user = await User.findById(req.userId);
      
      // Periksa apakah pengguna ditemukan
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.role === 'admin') {
        console.log('Admin tidak dapat mengedit username.'); // sebagai tanda bahwa admin tidak bisa ganti username
        return res.status(403).json({ message: 'Admin tidak dapat mengedit username.' });
      }
      // Jika newUsername adalah 'admin', kembalikan respons dengan pesan yang sesuai
      if (newUsername.toLowerCase() === 'admin') {
        console.log('Username tidak boleh "admin".'); // console log pesan bahwa username tidak boleh 'admin'
        return res.status(403).json({ message: 'Username tidak boleh "admin".' });
      }
      
      const existingUser = await User.findOne({ username: newUsername });
      if (existingUser) {
        console.log('Username sudah digunakan, silakan pilih username lain.'); // console log pesan bahwa username sudah digunakan
        return res.status(409).json({ message: 'Username sudah digunakan, silakan pilih username lain.' });
      }
      // Perbarui username pengguna
      user.username = newUsername;
      await user.save();
  
      console.log('Username updated successfully:', newUsername); 
  
      // Kirim respons dengan data pengguna yang diperbarui
      req.session.user.username = newUsername;
      res.redirect('/profile');
    } catch (error) {
      console.log(error);
      res.redirect('/error')
    }
  });


module.exports = router;
