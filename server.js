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

// Use a simpler Multer configuration that accepts all fields
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).any();

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

    // Debug: Log all incoming data
    console.log('Upload request body:', req.body);
    console.log('Upload files:');
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        console.log(`File: ${file.fieldname}, Filename: ${file.originalname}, Size: ${file.size}`);
      });
    } else {
      console.log('No files in the request');
    }

    try {
      // Find main artwork file
      const mainArtworkFile = req.files.find(file => file.fieldname === 'artwork');
      if (!mainArtworkFile) {
        return res.status(400).json({
          success: false,
          message: 'No main artwork image uploaded'
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
      }

      // Parse formats JSON
      let formats = {};
      try {
        if (req.body.formats) {
          formats = JSON.parse(req.body.formats);
          console.log('Parsed formats:', formats);
        }
      } catch (error) {
        console.error('Error parsing formats:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid format data: ' + error.message
        });
      }

      // Process format images
      req.files.forEach(file => {
        // Skip main artwork
        if (file.fieldname === 'artwork') return;
        
        // Format images are named: formatName_image
        const parts = file.fieldname.split('_');
        if (parts.length === 2 && parts[1] === 'image') {
          const formatName = parts[0];
          if (formats[formatName]) {
            formats[formatName].image = file.filename;
          }
        }
      });

      // Create new artwork object
      const newWork = {
        title: req.body.title || 'Untitled',
        image: mainArtworkFile.filename,
        description: req.body.description || '',
        isOriginalForSale: req.body.isOriginalForSale === 'true',
        formats: formats
      };

      // Debug: Log the new work object before saving
      console.log('New work object:', newWork);

      // Add the artwork to the collection
      works.push(newWork);
      
      // Save the updated works collection
      fs.writeFileSync(worksFilePath, JSON.stringify(works, null, 2));

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

// Update artwork endpoint - now with file uploads
app.post('/api/update-artwork', (req, res) => {
  upload(req, res, function(err) {
    // Handle multer errors
    if (err) {
      console.error('Update error:', err);
      return res.status(400).json({
        success: false,
        message: 'Update error: ' + err.message
      });
    }

    // Debug: Log all incoming data
    console.log('Update request body:', req.body);
    console.log('Update files:');
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        console.log(`File: ${file.fieldname}, Filename: ${file.originalname}, Size: ${file.size}`);
      });
    } else {
      console.log('No files in the request');
    }

    try {
      // Validate artwork path
      if (!req.body.artworkPath) {
        return res.status(400).json({
          success: false,
          message: 'Missing artwork path'
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
          message: 'Error reading works database: ' + error.message
        });
      }

      // Find the artwork by image filename (used as path reference)
      const artworkPath = req.body.artworkPath;
      const index = works.findIndex(work => work.image === artworkPath);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: 'Artwork not found'
        });
      }

      // Make a copy of the existing artwork
      const existingWork = works[index];
      const oldImages = [];
      
      // Parse formats JSON
      let formats = {};
      try {
        if (req.body.formats) {
          formats = JSON.parse(req.body.formats);
          console.log('Parsed formats:', formats);
        }
      } catch (error) {
        console.error('Error parsing formats:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid format data: ' + error.message
        });
      }

      // Process format images (new or replaced)
      req.files.forEach(file => {
        // Skip main artwork if present
        if (file.fieldname === 'artwork') return;
        
        const parts = file.fieldname.split('_');
        if (parts.length === 2 && parts[1] === 'image') {
          const formatName = parts[0];
          if (formats[formatName]) {
            // If this format had an old image, track it for deletion
            if (existingWork.formats[formatName] && existingWork.formats[formatName].image) {
              oldImages.push(existingWork.formats[formatName].image);
            }
            // Set the new image filename
            formats[formatName].image = file.filename;
          }
        }
      });

      // Process format image removals (without replacement)
      Object.keys(formats).forEach(formatName => {
        // Format exists in new data but has image=null 
        // AND format existed before with an image
        if (formats[formatName].image === null && 
            existingWork.formats[formatName] && 
            existingWork.formats[formatName].image) {
          // Track the old image for deletion
          oldImages.push(existingWork.formats[formatName].image);
        }
        // Format exists in old and new data, new data didn't change the image
        else if (formats[formatName].image === undefined && 
                existingWork.formats[formatName] && 
                existingWork.formats[formatName].image) {
          // Keep the existing image
          formats[formatName].image = existingWork.formats[formatName].image;
        }
      });

      // Create the updated artwork
      const updatedWork = {
        title: req.body.title || existingWork.title,
        image: existingWork.image, // Keep the original image
        description: req.body.description || existingWork.description,
        isOriginalForSale: req.body.isOriginalForSale === 'true',
        formats: formats
      };

      // Debug: Log the updated work object
      console.log('Updated work object:', updatedWork);

      // Replace the artwork in the collection
      works[index] = updatedWork;
      
      // Save the updated works collection
      fs.writeFileSync(worksFilePath, JSON.stringify(works, null, 2));

      // Delete old format images that were replaced or removed
      const imageDir = path.join(__dirname, 'site/image');
      oldImages.forEach(filename => {
        const imagePath = path.join(imageDir, filename);
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (err) {
            console.error('Error deleting old image file:', err);
          }
        }
      });

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
});

// Delete artwork endpoint
app.post('/api/delete-artwork', (req, res) => {
  try {
    // Validate required fields
    if (!req.body || !req.body.path) {
      return res.status(400).json({
        success: false,
        message: 'Missing artwork path'
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

    // Find the artwork by image filename
    const index = works.findIndex(work => work.image === req.body.path);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    // Optional: Delete associated image files
    const artwork = works[index];
    const imageDir = path.join(__dirname, 'site/image');
    const imagesToDelete = [];
    
    // Add main artwork image
    if (artwork.image) {
      imagesToDelete.push(artwork.image);
    }
    
    // Add all format images
    if (artwork.formats) {
      Object.entries(artwork.formats).forEach(([formatName, formatData]) => {
        if (formatData && formatData.image) {
          imagesToDelete.push(formatData.image);
        }
      });
    }
    
    // Delete all images
    imagesToDelete.forEach(filename => {
      const imagePath = path.join(imageDir, filename);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error(`Error deleting image file: ${filename}`, err);
        }
      }
    });

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
