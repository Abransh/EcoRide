// /backend/src/services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto',
      folder: options.folder || 'eco-ride',
      public_id: options.public_id,
      overwrite: options.overwrite || false,
      transformation: options.transformation || [],
      ...options
    };

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload failed:', error);
          reject(error);
        } else {
          console.log(`✅ File uploaded to Cloudinary: ${result.public_id}`);
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

/**
 * Upload file from URL to Cloudinary
 * @param {String} url - File URL
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
const uploadFromUrl = async (url, options = {}) => {
  try {
    const uploadOptions = {
      folder: options.folder || 'eco-ride',
      public_id: options.public_id,
      overwrite: options.overwrite || false,
      transformation: options.transformation || [],
      ...options
    };

    const result = await cloudinary.uploader.upload(url, uploadOptions);
    console.log(`✅ File uploaded from URL to Cloudinary: ${result.public_id}`);
    return result;

  } catch (error) {
    console.error('❌ Cloudinary URL upload failed:', error);
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Public ID of the file
 * @param {String} resourceType - Resource type (image, video, raw)
 * @returns {Promise<Object>} Delete result
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    console.log(`✅ File deleted from Cloudinary: ${publicId}`);
    return result;

  } catch (error) {
    console.error('❌ Cloudinary delete failed:', error);
    throw error;
  }
};

/**
 * Generate optimized image transformations
 * @param {String} publicId - Public ID of the image
 * @param {Object} options - Transformation options
 * @returns {String} Optimized image URL
 */
const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 300,
    height = 300,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
    gravity = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    fetch_format: format,
    gravity,
    secure: true
  });
};

/**
 * Create multiple image sizes (thumbnails)
 * @param {String} publicId - Public ID of the original image
 * @returns {Object} URLs for different sizes
 */
const createImageThumbnails = (publicId) => {
  return {
    thumbnail: cloudinary.url(publicId, {
      width: 150,
      height: 150,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    }),
    small: cloudinary.url(publicId, {
      width: 300,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    }),
    medium: cloudinary.url(publicId, {
      width: 600,
      height: 600,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    }),
    large: cloudinary.url(publicId, {
      width: 1200,
      height: 1200,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    }),
    original: cloudinary.url(publicId, {
      quality: 'auto',
      fetch_format: 'auto',
      secure: true
    })
  };
};

/**
 * Multer configuration for file uploads
 */
const multerConfig = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      // Allow image files
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
};

/**
 * Multer middleware for single file upload
 */
const uploadSingle = multer(multerConfig).single('file');

/**
 * Multer middleware for multiple file uploads
 */
const uploadMultiple = multer(multerConfig).array('files', 5);

/**
 * Express middleware for handling file upload errors
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field.'
      });
    }
  }

  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next(error);
};

/**
 * Get file info from Cloudinary
 * @param {String} publicId - Public ID of the file
 * @returns {Promise<Object>} File information
 */
const getFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'image'
    });

    return {
      success: true,
      info: {
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        url: result.secure_url,
        created_at: result.created_at
      }
    };

  } catch (error) {
    console.error('❌ Get file info failed:', error);
    return {
      success: false,
      error: 'Failed to get file information'
    };
  }
};

/**
 * Search files in Cloudinary
 * @param {String} expression - Search expression
 * @param {Object} options - Search options
 * @returns {Promise<Object>} Search results
 */
const searchFiles = async (expression, options = {}) => {
  try {
    const searchOptions = {
      expression,
      sort_by: options.sort_by || [['created_at', 'desc']],
      max_results: options.max_results || 20,
      ...options
    };

    const result = await cloudinary.search.expression(expression)
      .sort_by(searchOptions.sort_by[0][0], searchOptions.sort_by[0][1])
      .max_results(searchOptions.max_results)
      .execute();

    return {
      success: true,
      resources: result.resources,
      total_count: result.total_count
    };

  } catch (error) {
    console.error('❌ Search files failed:', error);
    return {
      success: false,
      error: 'Failed to search files'
    };
  }
};

/**
 * Create video thumbnail
 * @param {String} videoPublicId - Public ID of the video
 * @param {Object} options - Thumbnail options
 * @returns {String} Thumbnail URL
 */
const createVideoThumbnail = (videoPublicId, options = {}) => {
  const {
    width = 300,
    height = 200,
    crop = 'fill',
    start_offset = '5s', // Extract frame at 5 seconds
    quality = 'auto'
  } = options;

  return cloudinary.url(videoPublicId, {
    resource_type: 'video',
    width,
    height,
    crop,
    start_offset,
    quality,
    format: 'jpg',
    secure: true
  });
};

/**
 * Check if Cloudinary is configured
 * @returns {Boolean} Configuration status
 */
const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Get Cloudinary usage statistics
 * @returns {Promise<Object>} Usage statistics
 */
const getUsageStats = async () => {
  try {
    const result = await cloudinary.api.usage();
    
    return {
      success: true,
      usage: {
        plan: result.plan,
        last_updated: result.last_updated,
        objects: {
          used: result.objects.used,
          limit: result.objects.limit
        },
        bandwidth: {
          used: result.bandwidth.used,
          limit: result.bandwidth.limit
        },
        storage: {
          used: result.storage.used,
          limit: result.storage.limit
        }
      }
    };

  } catch (error) {
    console.error('❌ Get usage stats failed:', error);
    return {
      success: false,
      error: 'Failed to get usage statistics'
    };
  }
};

module.exports = {
  uploadToCloudinary,
  uploadFromUrl,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  createImageThumbnails,
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  getFileInfo,
  searchFiles,
  createVideoThumbnail,
  isConfigured,
  getUsageStats
};