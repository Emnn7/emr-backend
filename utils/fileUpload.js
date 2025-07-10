const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/diagnostics');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDFs are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware for handling file uploads
const uploadHandler = upload.array('files');

// Function to handle file upload (already handled by multer, just returns path)
const uploadFile = (file) => {
  return {
    url: `/uploads/diagnostics/${file.filename}`, // Remove any leading slashes or API prefix
    filename: file.filename,
    type: file.mimetype.startsWith('image/') ? 'image' : 'pdf'
  };
};

module.exports = {
  uploadHandler,
  uploadFile
};