/**
 * INSALATA.ART - Server
 * Express server for the artist portfolio site
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer'); // You'll need to install this: npm install nodemailer
const app = express();
const port = process.env.PORT || 3001;

// Email configuration - add this after the other configuration
let transporter = null;
try {
  // Initialize nodemailer only if SMTP settings are available
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    console.log('Email transport configured successfully');
  } else {
    console.log('Email transport not configured (missing env variables)');
  }
} catch (error) {
  console.error('Error configuring email transport:', error);
}

// Helper function to send emails - add after email configuration
async function sendEmail(options) {
  if (!transporter) {
    console.warn('Email not sent: Email transport not configured');
    return false;
  }
  
  try {
    const info = await transporter.sendMail(options);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

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
  // with encrypted passwords, sessions, etc.yy
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

// Checkout endpoint for Stripe payments
app.post('/api/create-checkout-session', async (req, res) => {
  // This is a placeholder endpoint for Stripe checkout
  // You'll need to install the Stripe SDK and configure it with your keys
  // npm install stripe

  try {
    // Placeholder for Stripe integration
    // In a real implementation, you would:
    // 1. Initialize Stripe with your API key: const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // 2. Create line items from the cart items
    // 3. Create a checkout session with those line items
    // 4. Return the session URL

    // For now, return a message explaining how to set up Stripe
    // res.status(501).json({
    //   success: false,
    //   message: 'Stripe checkout not implemented yet. See server.js for instructions.'
    // });

     
    // EXAMPLE IMPLEMENTATION (commented out until Stripe is installed)
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const items = req.body.items;   
    
    // Determine if any items are digital
    const hasDigitalItems = items.some(item => item.format && item.format.toLowerCase().includes('digital'));
    
    // Prepare digital links if any digital items exist
    let digitalLinks = [];
    if (hasDigitalItems) {
      // In a real application, you would generate unique download links for each digital item
      // For this example, we'll just create placeholders
      digitalLinks = items
        .filter(item => item.format && item.format.toLowerCase().includes('digital'))
        .map(item => ({
          title: `${item.artworkTitle} (${item.format})`,
          url: `${req.headers.origin}/downloads/${encodeURIComponent(item.artworkTitle.replace(/\s+/g, '-').toLowerCase())}.zip`
        }));
    }
    
    const line_items = items.map(i => ({
      price_data: {
        currency: 'gbp',
        product_data: { 
          name: `${i.artworkTitle} (${i.format})`
          // Images are now handled at the session level
        },
        unit_amount: Math.round(i.price * 100)   // pence
      },
      quantity: i.qty
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items,
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/`,
      shipping_address_collection: {
        allowed_countries: ['GB', 'US', 'CA', 'IT']
      },
      // Store metadata about the order
      metadata: {
        hasDigitalItems: hasDigitalItems.toString(),
        digitalLinks: hasDigitalItems ? JSON.stringify(digitalLinks) : null,
        order_items: JSON.stringify(items.map(i => `${i.artworkTitle} (${i.format})`))
      },
      // We'll use these UI customizations for a better experience
      custom_text: {
        shipping_address: {
          message: hasDigitalItems ? 
            'Please provide your shipping address for any physical items. Digital items will be sent to your email.' : 
            'Please provide your shipping address for delivery of your artwork.'
        },
        submit: {
          message: 'We\'ll process your order once payment is complete.'
        }
      }
    });
    
    res.json({ url: session.url });
    

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// Webhook endpoint for Stripe events
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle different event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await handleSuccessfulPayment(session);
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      await handleFailedPayment(paymentIntent);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
});

// Handler for successful payments
async function handleSuccessfulPayment(session) {
  // Retrieve more details if needed
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    
    // Collect order details
    const orderItems = lineItems.data.map(item => {
      return {
        description: item.description,
        quantity: item.quantity,
        amount: item.amount_total / 100 // Convert from cents to pounds
      };
    });
    
    // Send notification to the artist/admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@insalata.art';
    
    await sendEmail({
      from: `"INSALATA.ART" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: 'New Order Received',
      html: `
        <h1>New Order Received</h1>
        <p><strong>Order ID:</strong> ${session.id}</p>
        <p><strong>Customer:</strong> ${session.customer_details.name}</p>
        <p><strong>Email:</strong> ${session.customer_details.email}</p>
        <p><strong>Total:</strong> £${session.amount_total / 100}</p>
        <h2>Items Ordered:</h2>
        <ul>
          ${orderItems.map(item => `<li>${item.quantity}x ${item.description} - £${item.amount.toFixed(2)}</li>`).join('')}
        </ul>
        <h2>Shipping Address:</h2>
        <p>
          ${session.shipping ? 
            `${session.shipping.name}<br>
             ${session.shipping.address.line1}<br>
             ${session.shipping.address.line2 ? session.shipping.address.line2 + '<br>' : ''}
             ${session.shipping.address.city}, ${session.shipping.address.state || ''} ${session.shipping.address.postal_code}<br>
             ${session.shipping.address.country}`
            : 'No shipping information provided'}
        </p>
      `
    });
    
    // Send confirmation to the customer with digital items if applicable
    const customerEmail = session.customer_details.email;
    const metadata = session.metadata || {};
    const isDigitalOrder = metadata.hasDigitalItems === 'true';
    
    let emailContent = `
      <h1>Thank you for your order!</h1>
      <p>We've received your order and are processing it now.</p>
      <h2>Order Summary:</h2>
      <ul>
        ${orderItems.map(item => `<li>${item.quantity}x ${item.description} - £${item.amount.toFixed(2)}</li>`).join('')}
      </ul>
    `;
    
    // Add digital downloads if applicable
    if (isDigitalOrder) {
      emailContent += `
        <h2>Your Digital Downloads:</h2>
        <p>You can download your digital items using the following links:</p>
        <ul>
          ${metadata.digitalLinks ? 
            JSON.parse(metadata.digitalLinks).map(link => 
              `<li><a href="${link.url}">${link.title}</a></li>`
            ).join('') 
            : '<li>Your digital items will be delivered separately.</li>'}
        </ul>
      `;
    }
    
    await sendEmail({
      from: `"INSALATA.ART" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: 'Your INSALATA.ART Order Confirmation',
      html: emailContent
    });
    
    console.log(`Order processed successfully for session ${session.id}`);
  } catch (error) {
    console.error('Error processing successful payment:', error);
  }
}

// Handler for failed payments
async function handleFailedPayment(paymentIntent) {
  try {
    console.log(`Payment failed for payment intent ${paymentIntent.id}`);
    
    // If we have customer info, we could notify them
    if (paymentIntent.receipt_email) {
      await sendEmail({
        from: `"INSALATA.ART" <${process.env.EMAIL_USER}>`,
        to: paymentIntent.receipt_email,
        subject: 'Issue with your INSALATA.ART Payment',
        html: `
          <h1>We noticed an issue with your payment</h1>
          <p>Unfortunately, your payment could not be processed. The reason provided was: ${paymentIntent.last_payment_error?.message || 'Unknown error'}</p>
          <p>Please try again with a different payment method or contact your bank for assistance.</p>
          <p>If you continue to experience issues, please contact us for support.</p>
        `
      });
    }
    
    // Notify the admin as well
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@insalata.art';
    await sendEmail({
      from: `"INSALATA.ART" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: 'Payment Failed Notification',
      html: `
        <h1>Payment Failed Alert</h1>
        <p>A payment has failed for payment intent ${paymentIntent.id}</p>
        <p>Amount: £${paymentIntent.amount / 100}</p>
        <p>Customer email: ${paymentIntent.receipt_email || 'Not provided'}</p>
        <p>Error: ${paymentIntent.last_payment_error?.message || 'Unknown error'}</p>
      `
    });
  } catch (error) {
    console.error('Error processing failed payment:', error);
  }
}

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
