/**
 * INSALATA.ART - Server
 * Express server for the artist portfolio site
 */

const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'site')));
app.use(express.json());

// Serve index.html on the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

// Authentication endpoint (simple, no session management for demo)
app.post('/api/signin', (req, res) => {
  const { username, password } = req.body;
  
  // In a production environment, you would use proper authentication
  // with encrypted passwords, sessions, etc.
  const validCredentials = username === 'admin' && password === 'admin';
  
  if (validCredentials) {
    res.json({ success: true, message: 'Sign-in successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'site/image');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const filename = timestamp + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
}).fields([
  { name: 'artwork', maxCount: 1 },
  { name: 'digitalImage', maxCount: 1 },
  { name: 'printImage', maxCount: 1 },
  { name: 'stickerImage', maxCount: 1 }
]);

// Upload artwork endpoint
app.post('/api/upload', (req, res) => {
  upload(req, res, function(err) {
    // Handle multer errors
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({
        success: false,
        message: 'Upload error: ' + err.message
      });
    }

    try {
      // Validate required fields
      if (!req.files || !req.files.artwork) {
        return res.status(400).json({
          success: false,
          message: 'No artwork uploaded'
        });
      }

      // Load existing artworks
      const worksFilePath = path.join(__dirname, 'site/image/works.json');
      let works = [];
      
      try {
        if (fs.existsSync(worksFilePath)) {
          const fileContent = fs.readFileSync(worksFilePath, 'utf8');
          works = JSON.parse(fileContent);
        }
      } catch (error) {
        console.error('Error reading works.json:', error);
        // Create a new works array if file doesn't exist or is invalid
      }

      // Create new artwork object
      const newWork = {
        title: req.body.title || 'Untitled',
        image: req.files.artwork[0].filename,
        description: req.body.description || '',
        isOriginalForSale: req.body.isOriginalForSale === 'true',
        formats: {}
      };

      // Parse formats from the request
      try {
        if (req.body.formats) {
          newWork.formats = JSON.parse(req.body.formats);
          
          // Add format images if they exist
          ['digital', 'print', 'sticker'].forEach(format => {
            if (req.files[`${format}Image`] && newWork.formats[format]) {
              newWork.formats[format].image = req.files[`${format}Image`][0].filename;
            }
          });
        }
      } catch (error) {
        console.error('Error parsing formats:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid format data'
        });
      }

      // Add the new artwork to the collection
      works.push(newWork);
      
      // Save the updated works collection
      fs.writeFileSync(worksFilePath, JSON.stringify(works, null, 2));

      // Return success response
      res.json({
        success: true,
        message: 'Artwork uploaded successfully',
        artwork: newWork
      });

    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  });
});

// Update artwork endpoint
app.post('/api/update-artwork', (req, res) => {
  try {
    // Validate required fields
    if (!req.body || !req.body.id) {
      return res.status(400).json({
        success: false,
        message: 'Missing artwork ID'
      });
    }

    // Load existing artworks
    const worksFilePath = path.join(__dirname, 'site/image/works.json');
    let works = [];
    
    try {
      if (fs.existsSync(worksFilePath)) {
        const fileContent = fs.readFileSync(worksFilePath, 'utf8');
        works = JSON.parse(fileContent);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Works database not found'
        });
      }
    } catch (error) {
      console.error('Error reading works.json:', error);
      return res.status(500).json({
        success: false,
        message: 'Error reading works database'
      });
    }

    // Find the artwork by image filename (used as ID)
    const index = works.findIndex(work => work.image === req.body.id);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    // Update the artwork with new data
    const updatedWork = {
      ...works[index],
      ...req.body
    };

    // Replace the old artwork with the updated one
    works[index] = updatedWork;
    
    // Save the updated works collection
    fs.writeFileSync(worksFilePath, JSON.stringify(works, null, 2));

    // Return success response
    res.json({
      success: true,
      message: 'Artwork updated successfully',
      artwork: updatedWork
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Delete artwork endpoint
app.post('/api/delete-artwork', (req, res) => {
  try {
    // Validate required fields
    if (!req.body || !req.body.id) {
      return res.status(400).json({
        success: false,
        message: 'Missing artwork ID'
      });
    }

    // Load existing artworks
    const worksFilePath = path.join(__dirname, 'site/image/works.json');
    let works = [];
    
    try {
      if (fs.existsSync(worksFilePath)) {
        const fileContent = fs.readFileSync(worksFilePath, 'utf8');
        works = JSON.parse(fileContent);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Works database not found'
        });
      }
    } catch (error) {
      console.error('Error reading works.json:', error);
      return res.status(500).json({
        success: false,
        message: 'Error reading works database'
      });
    }

    // Find the artwork by image filename (used as ID)
    const index = works.findIndex(work => work.image === req.body.id);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    // Optional: Delete associated image files
    const artwork = works[index];
    const imageDir = path.join(__dirname, 'site/image');
    
    // Delete main artwork image
    if (artwork.image) {
      const imagePath = path.join(imageDir, artwork.image);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting image file:', err);
        }
      }
    }
    
    // Delete format images if they exist
    if (artwork.formats) {
      ['digital', 'print', 'sticker'].forEach(format => {
        if (artwork.formats[format] && artwork.formats[format].image) {
          const formatImagePath = path.join(imageDir, artwork.formats[format].image);
          if (fs.existsSync(formatImagePath)) {
            try {
              fs.unlinkSync(formatImagePath);
            } catch (err) {
              console.error(`Error deleting ${format} image file:`, err);
            }
          }
        }
      });
    }

    // Remove the artwork from the array
    works.splice(index, 1);
    
    // Save the updated works collection
    fs.writeFileSync(worksFilePath, JSON.stringify(works, null, 2));

    // Return success response
    res.json({
      success: true,
      message: 'Artwork deleted successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
