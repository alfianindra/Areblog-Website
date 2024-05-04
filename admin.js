const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./server/models/User');
const fs = require('fs');

process.env.MONGODB_URI = 'mongodb://localhost:27017/testing_news';

const connectDB = async () => {
  
    try {
      mongoose.set('strictQuery', false);
      const conn = await mongoose.connect(process.env.MONGODB_URI);
      console.log(`Database Connected: ${conn.connection.host}`);
    } catch (error) {
      console.log(error);
    }
  
  }

const importAdmin = async () => {
  try {
    // Baca isi file admin.json
    const adminData = fs.readFileSync('admin.json', 'utf-8');
    const admin = JSON.parse(adminData);

    // Hash password admin
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
    admin.password = hashedPassword;

    // Buat koneksi ke database
    await connectDB();

    // Simpan data admin ke MongoDB
    await User.create(admin);

    console.log('Admin berhasil diimpor ke MongoDB');
  } catch (error) {
    console.error('Gagal mengimpor admin:', error);
  } finally {
    mongoose.disconnect();
  }
};

importAdmin();