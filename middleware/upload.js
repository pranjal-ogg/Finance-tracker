const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the directory exists
const uploadDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // user_id _ timestamp _ originalname
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${req.user.id}_${Date.now()}_${safeName}`);
  }
});

// File Type Filter
function checkFileType(file, cb) {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    // Triggers an error passed down to our route middleware
    cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are permitted.'));
  }
}

// Upload Initialization
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

module.exports = upload;
