/**
 * INSALATA.ART - Modern JavaScript
 * A clean, interactive implementation with enhanced functionality
 */

// Wait for the DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the application
  initApp();
});

// Global variable to store all artworks for navigation
let allArtworks = [];
let currentArtworkIndex = -1;

/**
 * Main application initialization
 */
function initApp() {
  console.log('Initializing application');
  
    // Initialize the gallery
    initGallery();
    
  // Set up navigation and UI interactions
    setupNavigation();
  
  // Set up forms and modals
  setupForms();
  
  // Update the copyright year
  document.getElementById('copyright-year').textContent = new Date().getFullYear();
  
  // Check if user is already logged in
  console.log('Checking authentication status');
  checkAuthStatus();
  
  // Initialize cart
  updateCartCount();
  
  console.log('Application initialized');
}

/**
 * Initialize the artwork gallery
 */
function initGallery() {
  const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;
    
  // Fetch the artwork data
  fetchArtworks()
    .then(artworks => {
      if (!artworks || artworks.length === 0) {
        galleryContainer.innerHTML = '<p class="no-items">No artworks available</p>';
                return;
            }
            
      // Randomize the order of artworks
      const shuffledArtworks = shuffleArray(artworks);
      
      // Render the gallery with the shuffled artworks
      renderGallery(galleryContainer, shuffledArtworks);
        })
        .catch(error => {
      console.error('Error loading gallery:', error);
      galleryContainer.innerHTML = '<p class="no-items">Failed to load artworks</p>';
      showToast('Failed to load artworks', 'error');
    });
}

/**
 * Fetch artworks from the server
 */
async function fetchArtworks() {
  try {
    const response = await fetch('image/works.json');
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    const artworks = await response.json();
    
    // Filter out duplicates (based on image filename)
    allArtworks = artworks.filter((artwork, index, self) => 
      index === self.findIndex(a => a.image === artwork.image)
    );
    return allArtworks;
  } catch (error) {
    console.error('Error fetching artworks:', error);
    throw error;
  }
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Render the gallery with artwork items
 */
function renderGallery(container, artworks) {
  // Clear existing items
    container.innerHTML = '';
    
  // Create elements for each artwork
  artworks.forEach((artwork, index) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.setAttribute('data-artwork', JSON.stringify(artwork));
    
    // Set animation order for staggered effect
    item.style.setProperty('--animation-order', index);
    
    // Create image element
    const image = document.createElement('img');
    image.src = `image/${artwork.image}`;
    image.alt = artwork.title || 'Untitled artwork';
    image.loading = 'lazy';
    
    // Create title element
    const title = document.createElement('div');
    title.className = 'gallery-item-title';
    title.textContent = artwork.title || 'Untitled';
    
    // Add elements to the gallery item
    item.appendChild(image);
    item.appendChild(title);
    
    // Add click event to open the artwork modal
    item.addEventListener('click', () => {
      openArtworkModal(artwork);
    });
    
    // Add to container
    container.appendChild(item);
  });
  
  // Use imagesLoaded to ensure all images are loaded
  imagesLoaded(container, function() {
    console.log('All images loaded successfully');
  });
}

/**
 * Create a gallery item element for an artwork
 */
function createGalleryItem(artwork) {
  const item = document.createElement('div');
  item.className = 'gallery-item';
  item.setAttribute('data-artwork', JSON.stringify(artwork));
  
  const image = document.createElement('img');
  image.src = `image/${artwork.image}`;
  image.alt = artwork.title || 'Untitled artwork';
  image.loading = 'lazy';
  
  const title = document.createElement('div');
  title.className = 'gallery-item-title';
  title.textContent = artwork.title || 'Untitled';
  
  item.appendChild(image);
  item.appendChild(title);
  
  // Add click event to open the artwork modal
  item.addEventListener('click', () => {
    openArtworkModal(artwork);
    });
    
    return item;
}

/**
 * Open the artwork modal with details
 */
function openArtworkModal(artwork) {
  const modal = document.getElementById('artwork-modal');
  if (!modal) return;
    
  // Update the current artwork index
  currentArtworkIndex = allArtworks.findIndex(a => a.image === artwork.image);
  
  // Set the artwork image
  document.getElementById('modal-artwork-image').src = `image/${artwork.image}`;
  
  // Store the artwork data for the details modal
  modal.setAttribute('data-artwork', JSON.stringify(artwork));
  
  // Show the modal
  showModal(modal);
  
  // Setup navigation buttons
  setupArtworkNavigation();
}

/**
 * Setup navigation for the artwork modal
 */
function setupArtworkNavigation() {
  const prevBtn = document.getElementById('prev-artwork-btn');
  const nextBtn = document.getElementById('next-artwork-btn');
  const detailsBtn = document.getElementById('artwork-details-btn');
  
  // Remove existing event listeners (to prevent duplicates)
  const newPrevBtn = prevBtn.cloneNode(true);
  const newNextBtn = nextBtn.cloneNode(true);
  const newDetailsBtn = detailsBtn.cloneNode(true);
  
  prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
  nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
  detailsBtn.parentNode.replaceChild(newDetailsBtn, detailsBtn);
  
  // Add click event listeners
  newPrevBtn.addEventListener('click', navigateToPreviousArtwork);
  newNextBtn.addEventListener('click', navigateToNextArtwork);
  newDetailsBtn.addEventListener('click', openArtworkDetails);
  
  // Also set up keyboard navigation
  document.removeEventListener('keydown', handleArtworkKeyNavigation);
  document.addEventListener('keydown', handleArtworkKeyNavigation);
}

/**
 * Navigate to the previous artwork
 */
function navigateToPreviousArtwork(e) {
  e.stopPropagation();
  
  if (allArtworks.length === 0 || currentArtworkIndex === -1) return;
  
  // Calculate the previous index (wrap around if at the beginning)
  const prevIndex = (currentArtworkIndex - 1 + allArtworks.length) % allArtworks.length;
  
  // Update current index
  currentArtworkIndex = prevIndex;
  
  // Display the previous artwork
  const artwork = allArtworks[prevIndex];
  const modal = document.getElementById('artwork-modal');
  
  // Update the image
  document.getElementById('modal-artwork-image').src = `image/${artwork.image}`;
  
  // Store the artwork data
  modal.setAttribute('data-artwork', JSON.stringify(artwork));
}

/**
 * Navigate to the next artwork
 */
function navigateToNextArtwork(e) {
  e.stopPropagation();
  
  if (allArtworks.length === 0 || currentArtworkIndex === -1) return;
  
  // Calculate the next index (wrap around if at the end)
  const nextIndex = (currentArtworkIndex + 1) % allArtworks.length;
  
  // Update current index
  currentArtworkIndex = nextIndex;
  
  // Display the next artwork
  const artwork = allArtworks[nextIndex];
  const modal = document.getElementById('artwork-modal');
  
  // Update the image
  document.getElementById('modal-artwork-image').src = `image/${artwork.image}`;
  
  // Store the artwork data
  modal.setAttribute('data-artwork', JSON.stringify(artwork));
}

/**
 * Open the artwork details modal
 */
function openArtworkDetails(e) {
  e.stopPropagation();
  
  // Get the artwork data from the main modal
  const artworkModal = document.getElementById('artwork-modal');
  const artworkData = JSON.parse(artworkModal.getAttribute('data-artwork') || '{}');
  
  // Populate the details modal
  const detailsModal = document.getElementById('artwork-details-modal');
  populateDetailsModal(artworkData, detailsModal);
  
  // Show the details modal
  showModal(detailsModal);
}

/**
 * Populate the details modal with artwork information
 */
function populateDetailsModal(artwork, modal) {
  document.getElementById('details-artwork-title').textContent = artwork.title || 'Untitled';
  document.getElementById('details-artwork-description').textContent = artwork.description || '';
  
  // Clear and populate format options
  const formatOptions = document.getElementById('details-format-options');
  formatOptions.innerHTML = '';
  
  // Add available formats
  if (artwork.formats && Object.keys(artwork.formats).length > 0) {
    Object.entries(artwork.formats).forEach(([format, details]) => {
      if (details && details.available) {
        addFormatOption(formatOptions, artwork, format, details);
      }
    });
  }
  
  // Add original artwork option if available
  if (artwork.isOriginalForSale) {
    addOriginalOption(formatOptions, artwork);
  }
  
  // If no formats are available, show a message
  if (formatOptions.children.length === 0) {
    formatOptions.innerHTML = '<p>No purchase options available for this artwork</p>';
  }
  
  // Store the artwork data for potential editing
  if (modal) {
    modal.setAttribute('data-artwork', JSON.stringify(artwork));
  }
}

/**
 * Handle edit artwork button click
 */
function handleEditArtwork() {
  // Get artwork data from the details modal
  const detailsModal = document.getElementById('artwork-details-modal');
  const artworkData = JSON.parse(detailsModal.getAttribute('data-artwork') || '{}');
  
  hideModal(detailsModal);
  
  // Populate and show the edit form
  const editModal = document.getElementById('edit-artwork-modal');
  const editForm = document.getElementById('edit-artwork-form');
  
  populateEditArtworkForm(editForm, artworkData);
  showModal(editModal);
}

/**
 * Populate edit artwork form with existing artwork data
 */
function populateEditArtworkForm(form, artwork) {
  // Clear the form first
  form.innerHTML = '';
  
  // Add title field
  const titleGroup = document.createElement('div');
  titleGroup.className = 'form-group';
  titleGroup.innerHTML = `
    <label for="edit-artwork-title">Title</label>
    <input type="text" id="edit-artwork-title" name="title" value="${artwork.title || ''}" required>
  `;
  form.appendChild(titleGroup);
  
  // Add description field
  const descriptionGroup = document.createElement('div');
  descriptionGroup.className = 'form-group';
  descriptionGroup.innerHTML = `
    <label for="edit-artwork-description">Description</label>
    <textarea id="edit-artwork-description" name="description" rows="4">${artwork.description || ''}</textarea>
  `;
  form.appendChild(descriptionGroup);
  
  // Original for sale checkbox
  const originalGroup = document.createElement('div');
  originalGroup.className = 'form-group';
  originalGroup.innerHTML = `
    <label class="checkbox-label">
      <input type="checkbox" id="edit-is-original-for-sale" name="isOriginalForSale" ${artwork.isOriginalForSale ? 'checked' : ''}>
      <span>Original Artwork Available for Purchase</span>
    </label>
  `;
  form.appendChild(originalGroup);
  
  // Add formats section
  const formatsSection = document.createElement('div');
  formatsSection.className = 'formats-section';
  formatsSection.innerHTML = '<h3>Available Formats</h3>';
  
  // Create formats container
  const formatsContainer = document.createElement('div');
  formatsContainer.id = 'edit-formats-container';
  formatsContainer.className = 'formats-container';
  formatsSection.appendChild(formatsContainer);

  // Add formats from artwork or create an empty one if none exist
  if (artwork.formats && Object.keys(artwork.formats).length > 0) {
    // Convert object-based formats to array for easier handling
    const formatsArray = [];
    
    // Handle existing formats
    Object.entries(artwork.formats).forEach(([formatType, details]) => {
      if (details && details.available) {
        formatsArray.push({
          type: formatType,
          price: details.price,
          available: details.available,
          image: details.image || null
        });
      }
    });
    
    // Render each format
    formatsArray.forEach((format, index) => {
      addFormatField(formatsContainer, format, index);
    });
  }
  
  // Add button to add new format
  const addFormatBtn = document.createElement('button');
  addFormatBtn.type = 'button';
  addFormatBtn.className = 'btn btn-outline add-format-btn';
  addFormatBtn.textContent = 'Add Format';
  addFormatBtn.addEventListener('click', () => {
    const formatCount = formatsContainer.querySelectorAll('.format-field').length;
    addFormatField(formatsContainer, { type: '', price: null, available: true }, formatCount);
  });
  formatsSection.appendChild(addFormatBtn);
  
  form.appendChild(formatsSection);
  
  // Add hidden path field for identifying the artwork - using filepath instead of ID
  const pathField = document.createElement('input');
  pathField.type = 'hidden';
  pathField.name = 'artworkPath';
  pathField.value = artwork.image || '';
  form.appendChild(pathField);
  
  // Add submit button
  const formActions = document.createElement('div');
  formActions.className = 'form-actions';
  formActions.innerHTML = `
    <button type="submit" class="btn btn-primary">Save Changes</button>
  `;
  form.appendChild(formActions);
  
  // Set up form submission
  form.addEventListener('submit', handleEditArtworkSubmit);
}

/**
 * Add a format field to the form
 */
function addFormatField(container, format, index) {
  const formatField = document.createElement('div');
  formatField.className = 'format-field';
  formatField.setAttribute('data-index', index);
  
  const hasImage = format.image ? true : false;
  
  formatField.innerHTML = `
    <div class="format-field-header">
      <div class="form-group format-type">
        <label for="format-type-${index}">Format Type</label>
        <input type="text" id="format-type-${index}" name="format-type-${index}" value="${format.type || ''}" required placeholder="e.g., Print, Mug, T-shirt">
      </div>
      <div class="form-group format-price">
        <label for="format-price-${index}">Price (£)</label>
        <input type="number" id="format-price-${index}" name="format-price-${index}" step="0.01" min="0" value="${format.price || ''}" placeholder="0.00">
      </div>
      <button type="button" class="btn btn-danger remove-format-btn" aria-label="Remove format">×</button>
    </div>
    <div class="form-group format-image-group">
      <label for="format-image-${index}">Format Image (Optional)</label>
      <input type="file" id="format-image-${index}" name="format-image-${index}" accept="image/*">
      <div class="image-preview" id="format-preview-${index}">
        ${hasImage ? `<img src="image/${format.image}" alt="Format preview">` : 'No image selected'}
      </div>
      ${hasImage ? `
        <div class="image-actions">
          <button type="button" class="btn btn-danger btn-sm remove-image-btn" data-index="${index}">Remove Image</button>
          <input type="hidden" name="format-image-remove-${index}" id="format-image-remove-${index}" value="false">
        </div>
      ` : ''}
    </div>
  `;
  
  // Add event listener to remove button
  const removeBtn = formatField.querySelector('.remove-format-btn');
  removeBtn.addEventListener('click', () => {
    container.removeChild(formatField);
    
    // Update indices for remaining format fields
    const formatFields = container.querySelectorAll('.format-field');
    formatFields.forEach((field, i) => {
      field.setAttribute('data-index', i);
      updateFormatFieldIds(field, i);
    });
  });
  
  // Add event listener to remove image button if present
  const removeImageBtn = formatField.querySelector('.remove-image-btn');
  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
      const formatIndex = removeImageBtn.getAttribute('data-index');
      const removeFlag = formatField.querySelector(`#format-image-remove-${formatIndex}`);
      const preview = formatField.querySelector(`#format-preview-${formatIndex}`);
      
      // Set the hidden flag to true
      removeFlag.value = 'true';
      
      // Update the preview
      preview.innerHTML = 'Image will be removed';
      preview.style.color = 'red';
      
      // Hide the remove button
      removeImageBtn.style.display = 'none';
    });
  }
  
  // Set up image preview for this format field
  setupImagePreview(formatField.querySelector(`#format-image-${index}`), formatField.querySelector(`#format-preview-${index}`));
  
  container.appendChild(formatField);
}

/**
 * Update the IDs and names of inputs in a format field after reordering
 */
function updateFormatFieldIds(field, newIndex) {
  // Update type input
  const typeInput = field.querySelector('[id^="format-type-"]');
  typeInput.id = `format-type-${newIndex}`;
  typeInput.name = `format-type-${newIndex}`;
  typeInput.labels[0].setAttribute('for', `format-type-${newIndex}`);
  
  // Update price input
  const priceInput = field.querySelector('[id^="format-price-"]');
  priceInput.id = `format-price-${newIndex}`;
  priceInput.name = `format-price-${newIndex}`;
  priceInput.labels[0].setAttribute('for', `format-price-${newIndex}`);
  
  // Update image input and preview
  const imageInput = field.querySelector('[id^="format-image-"]');
  if (imageInput) {
    imageInput.id = `format-image-${newIndex}`;
    imageInput.name = `format-image-${newIndex}`;
    imageInput.labels[0].setAttribute('for', `format-image-${newIndex}`);
    
    // Update image preview
    const imagePreview = field.querySelector('[id^="format-preview-"]');
    if (imagePreview) {
      imagePreview.id = `format-preview-${newIndex}`;
    }
    
    // Update remove image button and flag if present
    const removeImageBtn = field.querySelector('.remove-image-btn');
    if (removeImageBtn) {
      removeImageBtn.setAttribute('data-index', newIndex);
      
      const removeFlag = field.querySelector('[id^="format-image-remove-"]');
      if (removeFlag) {
        removeFlag.id = `format-image-remove-${newIndex}`;
        removeFlag.name = `format-image-remove-${newIndex}`;
      }
    }
  }
}

/**
 * Handle edit artwork form submission
 */
function handleEditArtworkSubmit(e) {
  e.preventDefault();
  showSpinner();
  
  // Create a FormData object for file uploads
  const formData = new FormData();
  
  // Add the artwork path
  const artworkPath = e.target.querySelector('input[name="artworkPath"]').value;
  formData.append('artworkPath', artworkPath);
  
  // Add basic fields
  formData.append('title', e.target.querySelector('#edit-artwork-title').value || '');
  formData.append('description', e.target.querySelector('#edit-artwork-description').value || '');
  formData.append('isOriginalForSale', e.target.querySelector('#edit-is-original-for-sale').checked);
  
  // Process formats
  const formatFields = e.target.querySelectorAll('.format-field');
  const formats = {};
  
  formatFields.forEach((field, index) => {
    const formatType = field.querySelector(`[id^="format-type-"]`).value;
    const formatPrice = field.querySelector(`[id^="format-price-"]`).value;
    
    if (formatType) {
      // Create base format object
      formats[formatType] = {
        price: parseFloat(formatPrice) || null,
        available: true
      };
      
      // Check if we should remove an existing image
      const removeImageFlag = field.querySelector(`[id^="format-image-remove-"]`);
      if (removeImageFlag && removeImageFlag.value === 'true') {
        // Signal to server to remove this image
        formats[formatType].image = null;
      }
      
      // Check if there's a new image to upload
      const formatImageInput = field.querySelector(`[id^="format-image-"]`);
      if (formatImageInput && formatImageInput.files && formatImageInput.files[0]) {
        // Add the file to FormData with a field name pattern: formatName_image
        formData.append(`${formatType}_image`, formatImageInput.files[0]);
      }
    }
  });
  
  // Add formats JSON to FormData
  formData.append('formats', JSON.stringify(formats));
  
  // Send update to server
  fetch('/api/update-artwork', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    hideSpinner();
    
    if (data.success) {
      hideModal(document.getElementById('edit-artwork-modal'));
      showToast('Artwork updated successfully', 'success');
      
      // Reload the page to see changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast(`Update failed: ${data.message}`, 'error');
    }
  })
  .catch(error => {
    hideSpinner();
    console.error('Update error:', error);
    showToast('Error updating artwork', 'error');
  });
}

/**
 * Handle delete artwork button click
 */
function handleDeleteArtwork() {
  // Get artwork data from the details modal
  const detailsModal = document.getElementById('artwork-details-modal');
  const artworkData = JSON.parse(detailsModal.getAttribute('data-artwork') || '{}');
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete "${artworkData.title || 'this artwork'}"?`)) {
    return;
  }
  
  // Show loading indicator
  showSpinner();
  
  // Send delete request to the server
  fetch('/api/delete-artwork', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: artworkData.image })
  })
  .then(response => response.json())
  .then(data => {
    hideSpinner();
    
    if (data.success) {
      // Hide the details modal and main artwork modal
      hideModal(detailsModal);
      hideModal(document.getElementById('artwork-modal'));
      
      // Show success message
      showToast('Artwork deleted successfully', 'success');
      
      // Refresh the gallery
      initGallery();
    } else {
      showToast(`Deletion failed: ${data.message}`, 'error');
    }
  })
  .catch(error => {
    hideSpinner();
    console.error('Delete error:', error);
    showToast('Error deleting artwork', 'error');
  });
}

/**
 * Set up site navigation and UI interactions
 */
function setupNavigation() {
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('.nav-list');
  
  if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navList.classList.toggle('active');
    });
  }
  
  // Handle modal triggers
  document.querySelectorAll('[data-modal]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById(trigger.getAttribute('data-modal'));
      if (modal) showModal(modal);
    });
  });
  
  // Set up the copyright year trigger for admin login
  const copyrightMark = document.getElementById('copyright-mark');
  if (copyrightMark) {
    copyrightMark.addEventListener('click', () => {
      showModal(document.getElementById('signin-modal'));
    });
  }
  
  // Works link scroll to top
  const worksLink = document.getElementById('works-link');
  if (worksLink) {
    worksLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  
  // Sign out button
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      signOut();
    });
  }
  
  // Close modals with close buttons
  document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      hideModal(closeBtn.closest('.modal'));
    });
  });
  
  // Make the artwork modal close when clicking on the background (but not the image)
  const artworkModal = document.getElementById('artwork-modal');
  if (artworkModal) {
    artworkModal.addEventListener('click', (e) => {
      // Only close if the click is directly on the modal or modal-wrapper
      // and not on any of its child elements like the image or buttons
      if (e.target === artworkModal || e.target.classList.contains('modal-wrapper')) {
        hideModal(artworkModal);
      }
    });
    
    // Make sure clicks on the image itself don't close the modal
    const artworkImage = artworkModal.querySelector('#modal-artwork-image');
    if (artworkImage) {
      artworkImage.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
  }
  
  // Close other modals when clicking outside the content
  document.querySelectorAll('.modal:not(#artwork-modal)').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-wrapper')) {
        hideModal(modal);
      }
    });
  });
  
  // Special handling for closing the details modal
  const detailsModal = document.getElementById('artwork-details-modal');
  if (detailsModal) {
    detailsModal.addEventListener('click', (e) => {
      if (e.target === detailsModal || e.target.classList.contains('modal-wrapper')) {
        hideModal(detailsModal);
      }
    });
  }
  
  // Escape key to close modals (prioritize nested modals)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const detailsModal = document.getElementById('artwork-details-modal');
      if (detailsModal && detailsModal.classList.contains('active')) {
        hideModal(detailsModal);
      } else {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) hideModal(activeModal);
      }
    }
  });
}

/**
 * Set up forms and form-related functionality
 */
function setupForms() {
  // Contact form submission
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactFormSubmit);
  }
    
  // Sign-in form submission
  const signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', handleSignin);
  }
  
  // Upload artwork form
  const uploadForm = document.getElementById('upload-form');
  if (uploadForm) {
    uploadForm.addEventListener('submit', handleUploadArtwork);
    setupCustomFormatsUI(uploadForm);
    setupImagePreviews(uploadForm);
  }
  
  // Edit artwork button
  const editArtworkBtn = document.getElementById('edit-artwork-btn');
  if (editArtworkBtn) {
    editArtworkBtn.addEventListener('click', handleEditArtwork);
  }
  
  // Delete artwork button
  const deleteArtworkBtn = document.getElementById('delete-artwork-btn');
  if (deleteArtworkBtn) {
    deleteArtworkBtn.addEventListener('click', handleDeleteArtwork);
  }
  
  // Edit about button
  const editAboutBtn = document.getElementById('edit-about-btn');
  if (editAboutBtn) {
    editAboutBtn.addEventListener('click', handleEditAbout);
  }
  
  // Edit about form
  const editAboutForm = document.getElementById('edit-about-form');
  if (editAboutForm) {
    editAboutForm.addEventListener('submit', handleSaveAbout);
  }
}

/**
 * Set up custom formats UI in the upload form
 */
function setupCustomFormatsUI(form) {
  const formatsSectionHTML = `
    <h3>Available Formats</h3>
    <div id="formats-container" class="formats-container"></div>
    <button type="button" class="btn btn-outline add-format-btn">Add Format</button>
  `;
  
  // Find the formats-section element or create it if it doesn't exist
  let formatsSection = form.querySelector('.formats-section');
  if (!formatsSection) {
    formatsSection = document.createElement('div');
    formatsSection.className = 'formats-section';
    form.insertBefore(formatsSection, form.querySelector('.form-actions'));
  }
  
  // Set its contents
  formatsSection.innerHTML = formatsSectionHTML;
  
  // Setup add format button
  const addFormatBtn = formatsSection.querySelector('.add-format-btn');
  const formatsContainer = formatsSection.querySelector('#formats-container');
  
  if (addFormatBtn && formatsContainer) {
    addFormatBtn.addEventListener('click', () => {
      const formatCount = formatsContainer.querySelectorAll('.format-field').length;
      addFormatField(formatsContainer, { type: '', price: null, available: true }, formatCount);
    });
    
    // Add at least one empty format field by default
    if (formatsContainer.children.length === 0) {
      addFormatField(formatsContainer, { type: '', price: null, available: true }, 0);
    }
  }
}

/**
 * Handle contact form submission
 */
function handleContactFormSubmit(e) {
  e.preventDefault();
  
  // In a real application, you would send this data to the server
  // For now, we'll just simulate a successful submission
  
  showSpinner();
  
  // Simulate network request
  setTimeout(() => {
    hideSpinner();
    hideModal(document.getElementById('contact-modal'));
    showToast('Thank you for your message! We will get back to you soon.', 'success');
    e.target.reset();
  }, 1000);
}

/**
 * Handle sign-in form submission
 */
function handleSignin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
  showSpinner();
  
  // Send sign-in request to the server
    fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
    hideSpinner();
    
    if (data.success) {
      // Store auth status in sessionStorage
      sessionStorage.setItem('authenticated', 'true');
      console.log('Authentication successful - setting sessionStorage');
      
      // Show admin UI
      enableAdminMode();
      
      // Hide sign-in modal
      hideModal(document.getElementById('signin-modal'));
      
      // Show success message
      showToast('Signed in successfully', 'success');
      
      // Reset form
      e.target.reset();
    } else {
      showToast('Invalid username or password', 'error');
    }
  })
  .catch(error => {
    hideSpinner();
    console.error('Sign-in error:', error);
    showToast('Error signing in', 'error');
  });
}

/**
 * Handle upload artwork form submission
 */
function handleUploadArtwork(e) {
  e.preventDefault();
  showSpinner();
  
  // Create a FormData object with the main artwork
  const formData = new FormData();
  
  // Get the main artwork file
  const artworkInput = e.target.querySelector('#artwork-image');
  if (artworkInput && artworkInput.files && artworkInput.files[0]) {
    formData.append('artwork', artworkInput.files[0]);
  } else {
    hideSpinner();
    showToast('Please select a main artwork image', 'error');
    return;
  }
  
  // Add basic fields
  formData.append('title', e.target.querySelector('#artwork-title').value || 'Untitled');
  formData.append('description', e.target.querySelector('#artwork-description').value || '');
  formData.append('isOriginalForSale', e.target.querySelector('#is-original-for-sale').checked);
  
  // Process formats
  const formatFields = e.target.querySelectorAll('.format-field');
  const formats = {};
  
  formatFields.forEach((field, index) => {
    const formatTypeInput = field.querySelector(`[id^="format-type-"]`);
    const formatPriceInput = field.querySelector(`[id^="format-price-"]`);
    
    if (!formatTypeInput || !formatPriceInput) return;
    
    const formatType = formatTypeInput.value;
    const formatPrice = formatPriceInput.value;
    
    if (formatType) {
      // Add to the formats object
      formats[formatType] = {
        price: parseFloat(formatPrice) || null,
        available: true
      };
      
      // Handle any image file for this format
      const formatImageInput = field.querySelector(`[id^="format-image-"]`);
      if (formatImageInput && formatImageInput.files && formatImageInput.files[0]) {
        // Add the file with a consistent naming pattern: formatName_image
        formData.append(`${formatType}_image`, formatImageInput.files[0]);
      }
    }
  });
  
  // Debug: Log the formats object to inspect it
  console.log('Formats object:', formats);
  
  // Add formats as JSON string
  formData.append('formats', JSON.stringify(formats));
  
  // Debug: Log all FormData entries
  console.log('FormData entries:');
  for (let pair of formData.entries()) {
    console.log(pair[0], pair[1] instanceof File ? `(File: ${pair[1].name})` : pair[1]);
  }
  
  // Send the upload request to the server
  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (!response.ok) {
      console.error('Upload failed with status:', response.status);
      return response.json().then(data => {
        console.error('Server error details:', data);
        return data;
      });
    }
    return response.json();
  })
  .then(data => {
    hideSpinner();
    
    if (data.success) {
      // Hide the upload modal
      hideModal(document.getElementById('upload-modal'));
      
      // Show success message
      showToast('Artwork uploaded successfully', 'success');
      
      // Reset form
      e.target.reset();
      clearImagePreviews(e.target);
      
      // Refresh the gallery
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      showToast(`Upload failed: ${data.message}`, 'error');
    }
  })
  .catch(error => {
    hideSpinner();
    console.error('Upload error:', error);
    showToast('Error uploading artwork', 'error');
  });
}

/**
 * Set up image previews for file inputs
 */
function setupImagePreviews(form) {
  // Main artwork image preview
  setupImagePreview(form.querySelector('#artwork-image'), form.querySelector('#artwork-preview'));
  
  // Format image previews
  setupImagePreview(form.querySelector('#digital-image'), form.querySelector('#digital-preview'));
  setupImagePreview(form.querySelector('#print-image'), form.querySelector('#print-preview'));
  setupImagePreview(form.querySelector('#sticker-image'), form.querySelector('#sticker-preview'));
}

/**
 * Set up image preview for a file input
 */
function setupImagePreview(input, previewContainer) {
  if (!input || !previewContainer) return;
  
  // Set default text
  previewContainer.textContent = 'No image selected';
  
  input.addEventListener('change', () => {
    // Clear previous preview
    previewContainer.innerHTML = '';
    
    // Check if a file was selected
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = 'Image preview';
        previewContainer.appendChild(img);
      };
      
      reader.readAsDataURL(input.files[0]);
    } else {
      previewContainer.textContent = 'No image selected';
    }
  });
}

/**
 * Clear all image previews in a form
 */
function clearImagePreviews(form) {
  if (!form) return;
  
  const previews = form.querySelectorAll('.image-preview');
  previews.forEach(preview => {
    preview.innerHTML = '';
    preview.textContent = 'No image selected';
  });
}

/**
 * Handle edit about button click
 */
function handleEditAbout() {
  console.log('handleEditAbout called');
  
  // Check authentication status
  const isAuthenticated = sessionStorage.getItem('authenticated') === 'true';
  console.log('Authentication status:', isAuthenticated);
  
  // Only proceed if user is authenticated
  if (!isAuthenticated) {
    console.log('User not authenticated, showing error toast');
    showToast('You need to be logged in as admin to edit content', 'error');
    // Show the signin modal
    showModal(document.getElementById('signin-modal'));
    return;
  }

  const aboutModal = document.getElementById('about-modal');
  const editAboutModal = document.getElementById('edit-about-modal');
  const aboutContent = document.getElementById('about-text');
  const aboutTextarea = document.getElementById('about-content');
  
  if (!aboutContent || !aboutTextarea) {
    console.error('Required elements not found!', { aboutContent, aboutTextarea });
    return;
  }
  
  // Set the textarea content
  aboutTextarea.value = aboutContent.innerHTML
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n\n')
    .trim();
  
  console.log('Opening edit about modal');
  
  // Hide the about modal if it's open
  if (aboutModal) {
    hideModal(aboutModal);
  }
  
  // Show the edit about modal
  showModal(editAboutModal);
}

/**
 * Handle save about form submission
 */
function handleSaveAbout(e) {
  e.preventDefault();
  
  const aboutContent = document.getElementById('about-text');
  const aboutTextarea = document.getElementById('about-content');
  
  if (!aboutContent || !aboutTextarea) return;
  
  // Convert text to paragraphs
  const paragraphs = aboutTextarea.value
    .split('\n\n')
    .filter(p => p.trim() !== '')
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
  
  // Update the about content
  aboutContent.innerHTML = paragraphs;
  
  // Hide the edit about modal
  hideModal(document.getElementById('edit-about-modal'));
  
  // Show the about modal
  showModal(document.getElementById('about-modal'));
  
  // Show success message
  showToast('About content updated successfully', 'success');
}

/**
 * Sign out the user
 */
function signOut() {
  // Remove auth status from sessionStorage
  sessionStorage.removeItem('authenticated');
  
  // Disable admin mode
  disableAdminMode();
  
  // Show message
  showToast('Signed out successfully', 'success');
}

/**
 * Check if the user is authenticated
 */
function checkAuthStatus() {
  // Check if user is authenticated
  if (sessionStorage.getItem('authenticated') === 'true') {
    enableAdminMode();
    console.log('Admin mode enabled: User is authenticated');
  } else {
    disableAdminMode();
    console.log('Admin mode disabled: User is not authenticated');
  }
}

/**
 * Enable admin mode
 */
function enableAdminMode() {
  document.body.classList.add('admin-mode');
  console.log('Admin mode enabled - added admin-mode class to body');
  
  // Make admin-only elements visible
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(element => {
    element.style.display = 'initial';
  });
}

/**
 * Disable admin mode
 */
function disableAdminMode() {
  document.body.classList.remove('admin-mode');
  console.log('Admin mode disabled - removed admin-mode class from body');
  
  // Hide admin-only elements
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(element => {
    element.style.display = 'none';
  });
}

/**
 * Show a modal
 */
function showModal(modal) {
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Hide a modal
 */
function hideModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
  
  // If it's the artwork modal, remove keyboard event listeners
  if (modal.id === 'artwork-modal') {
    document.removeEventListener('keydown', handleArtworkKeyNavigation);
    
    // Reset artwork navigation to prevent memory leaks
    const prevBtn = document.getElementById('prev-artwork-btn');
    const nextBtn = document.getElementById('next-artwork-btn');
    
    if (prevBtn) {
      prevBtn.replaceWith(prevBtn.cloneNode(true));
    }
    
    if (nextBtn) {
      nextBtn.replaceWith(nextBtn.cloneNode(true));
    }
  }
}

/**
 * Show the loading spinner
 */
function showSpinner() {
  const spinner = document.getElementById('spinner');
  if (spinner) spinner.classList.add('active');
}

/**
 * Hide the loading spinner
 */
function hideSpinner() {
  const spinner = document.getElementById('spinner');
  if (spinner) spinner.classList.remove('active');
}

/**
 * Show a toast notification
 */
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  if (!toast || !toastMessage) return;
  
  // Set the message
  toastMessage.textContent = message;
  
  // Set the type
  toast.className = 'toast';
  if (type) toast.classList.add(type);
  
  // Show the toast
  toast.classList.add('visible');
  
  // Hide the toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

/**
 * Handle keyboard navigation for artwork modal
 */
function handleArtworkKeyNavigation(e) {
  // Only process if the artwork modal is active
  const modal = document.getElementById('artwork-modal');
  if (!modal || !modal.classList.contains('active')) {
    return;
  }
  
  // Left arrow key for previous artwork
  if (e.key === 'ArrowLeft') {
    navigateToPreviousArtwork(e);
  }
  
  // Right arrow key for next artwork
  if (e.key === 'ArrowRight') {
    navigateToNextArtwork(e);
  }
}

/**
 * Handle window resize to adjust the gallery layout
 */
window.addEventListener('resize', debounce(() => {
  const galleryContainer = document.getElementById('gallery-container');
  if (galleryContainer && galleryContainer.children.length > 0) {
    // Get existing artwork data
    const artworks = Array.from(galleryContainer.children).map(item => {
      return JSON.parse(item.getAttribute('data-artwork') || '{}');
    });
    
    // Rebuild the gallery with the same artworks
    renderGallery(galleryContainer, artworks);
  }
}, 250));

/**
 * Debounce function to limit how often a function can be called
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Add a format option to the modal
 */
function addFormatOption(container, artwork, format, details) {
  const option = document.createElement('div');
  option.className = 'format-option';
  
  const formatName = format.charAt(0).toUpperCase() + format.slice(1);
  const price = details.price ? `£${parseFloat(details.price).toFixed(2)}` : 'Price on request';
  
  // Check if this format has an image
  const hasImage = details.image ? true : false;
  const thumbnailHtml = hasImage ? 
    `<div class="format-thumbnail">
      <img src="image/${details.image}" alt="${formatName} preview" loading="lazy">
     </div>` : '';
  
  option.innerHTML = `
      ${thumbnailHtml}
      <div class="format-info">
          <div class="format-name">${formatName}</div>
          <div class="format-price">${price}</div>
      </div>
      <button class="btn btn-primary" data-format="${format}">Add to Cart</button>
  `;
  
  // Add click event to button
  const actionBtn = option.querySelector('[data-format]');
  actionBtn.addEventListener('click', () => {
    addToCart(artwork, formatName, details.price);
    showToast(`${formatName} added to cart`, 'success');
  });
  
  container.appendChild(option);
}

/**
 * Add original artwork option to the modal
 */
function addOriginalOption(container, artwork) {
  const option = document.createElement('div');
  option.className = 'format-option original';
  
  option.innerHTML = `
      <div class="format-info">
          <div class="format-name">Original Artwork</div>
          <div class="format-price">Price on request</div>
      </div>
    <button class="btn btn-primary" data-format="original">Inquire</button>
  `;
  
  // Add click event to inquire button
  const inquireBtn = option.querySelector('[data-format]');
  inquireBtn.addEventListener('click', () => {
    openContactForm(artwork, 'Original Artwork', 'Price on request');
  });
  
  container.appendChild(option);
}

/**
 * Open the contact form for a specific artwork
 */
function openContactForm(artwork, format, price) {
  // Hide the modals
  hideModal(document.getElementById('artwork-details-modal'));
  hideModal(document.getElementById('artwork-modal'));
  
  // Set the artwork info in the contact form
  document.getElementById('artwork-info').value = `${artwork.title} - ${format} - ${price}`;
  
  // Show the contact modal
  showModal(document.getElementById('contact-modal'));
}

// Cart functions
/**
 * Add an item to the cart
 */
function addToCart(artwork, format, price) {
  const cart = getCart();
  
  // Create cart item
  const item = {
    artworkTitle: artwork.title || 'Untitled',
    artworkImage: artwork.image,
    format: format,
    price: parseFloat(price) || 0,
    qty: 1
  };
  
  // Check if item already exists in cart
  const existingIndex = cart.findIndex(i => 
    i.artworkTitle === item.artworkTitle && 
    i.format === item.format
  );
  
  if (existingIndex >= 0) {
    // If item exists, increase quantity
    cart[existingIndex].qty += 1;
  } else {
    // Otherwise add new item
    cart.push(item);
  }
  
  // Save updated cart
  saveCart(cart);
  
  // Update cart count display
  updateCartCount();
  
  // Hide artwork details modal
  hideModal(document.getElementById('artwork-details-modal'));
}

/**
 * Get the current cart from localStorage
 */
function getCart() {
  const cartStr = localStorage.getItem('cart');
  return cartStr ? JSON.parse(cartStr) : [];
}

/**
 * Save cart to localStorage
 */
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}

/**
 * Update cart item quantity
 */
function updateQty(index, change) {
  const cart = getCart();
  if (index >= 0 && index < cart.length) {
    cart[index].qty += change;
    
    // Remove item if quantity becomes 0 or less
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    
    saveCart(cart);
    updateCartCount();
    return true;
  }
  return false;
}

/**
 * Remove an item from the cart
 */
function removeItem(index) {
  const cart = getCart();
  if (index >= 0 && index < cart.length) {
    cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
    return true;
  }
  return false;
}

/**
 * Clear the entire cart
 */
function clearCart() {
  localStorage.removeItem('cart');
  updateCartCount();
}

/**
 * Update the cart count display
 */
function updateCartCount() {
  const cart = getCart();
  const totalItems = cart.reduce((total, item) => total + item.qty, 0);
  
  const cartCountElement = document.getElementById('cart-count');
  if (cartCountElement) {
    cartCountElement.textContent = totalItems;
    
    // Toggle visibility based on whether there are items
    if (totalItems > 0) {
      cartCountElement.classList.add('visible');
    } else {
      cartCountElement.classList.remove('visible');
    }
  }
}

/**
 * Show the cart modal
 */
function showCart() {
  const cart = getCart();
  const cartContainer = document.getElementById('cart-items');
  const cartTotalElement = document.getElementById('cart-total');
  const cartModal = document.getElementById('cart-modal');
  const emptyCartMessage = document.getElementById('empty-cart-message');
  const cartContentSection = document.getElementById('cart-content-section');
  
  if (!cartContainer || !cartModal) return;
  
  // Clear existing items
  cartContainer.innerHTML = '';
  
  if (cart.length === 0) {
    // Show empty cart message
    if (emptyCartMessage) emptyCartMessage.style.display = 'block';
    if (cartContentSection) cartContentSection.style.display = 'none';
    showModal(cartModal);
    return;
  }
  
  // Hide empty message, show content
  if (emptyCartMessage) emptyCartMessage.style.display = 'none';
  if (cartContentSection) cartContentSection.style.display = 'block';
  
  // Calculate total
  let total = 0;
  
  // Add each item to the cart
  cart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;
    
    const itemElement = document.createElement('div');
    itemElement.className = 'cart-item';
    itemElement.innerHTML = `
      <div class="cart-item-image">
        <img src="image/${item.artworkImage}" alt="${item.artworkTitle}">
      </div>
      <div class="cart-item-details">
        <div class="cart-item-title">${item.artworkTitle}</div>
        <div class="cart-item-format">${item.format}</div>
        <div class="cart-item-price">£${item.price.toFixed(2)}</div>
      </div>
      <div class="cart-item-quantity">
        <button class="qty-btn minus" data-index="${index}">-</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn plus" data-index="${index}">+</button>
      </div>
      <div class="cart-item-total">£${itemTotal.toFixed(2)}</div>
      <button class="remove-item-btn" data-index="${index}">&times;</button>
    `;
    
    cartContainer.appendChild(itemElement);
    
    // Add event listeners for quantity buttons
    const minusBtn = itemElement.querySelector('.minus');
    const plusBtn = itemElement.querySelector('.plus');
    const removeBtn = itemElement.querySelector('.remove-item-btn');
    
    minusBtn.addEventListener('click', () => {
      if (updateQty(index, -1)) {
        showCart(); // Refresh cart display
      }
    });
    
    plusBtn.addEventListener('click', () => {
      if (updateQty(index, 1)) {
        showCart(); // Refresh cart display
      }
    });
    
    removeBtn.addEventListener('click', () => {
      if (removeItem(index)) {
        showCart(); // Refresh cart display
      }
    });
  });
  
  // Update total display
  if (cartTotalElement) {
    cartTotalElement.textContent = `£${total.toFixed(2)}`;
  }
  
  // Show the cart modal
  showModal(cartModal);
}

/**
 * Proceed to checkout
 */
function proceedToCheckout() {
  const cart = getCart();
  
  if (cart.length === 0) {
    showToast('Your cart is empty', 'error');
    return;
  }
  
  showSpinner();
  
  fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart })
  })
  .then(response => response.json())
  .then(data => {
    hideSpinner();
    if (data.url) {
      window.location = data.url;
    } else {
      showToast('Error creating checkout session', 'error');
    }
  })
  .catch(error => {
    hideSpinner();
    console.error('Checkout error:', error);
    showToast('Error creating checkout session', 'error');
  });
}
