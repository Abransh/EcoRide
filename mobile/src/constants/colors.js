// Eco Ride Color Palette
export const COLORS = {
    // Primary Colors (Eco Green Theme)
    PRIMARY: '#4CAF50',        // Main eco green
    PRIMARY_DARK: '#388E3C',   // Darker green for pressed states
    PRIMARY_LIGHT: '#C8E6C9',  // Light green for backgrounds
    
    // Secondary Colors
    SECONDARY: '#2196F3',      // Electric blue
    SECONDARY_DARK: '#1976D2', // Darker blue
    SECONDARY_LIGHT: '#E3F2FD', // Light blue
    
    // Accent Colors
    ACCENT: '#FF9800',         // Sustainable orange
    ACCENT_DARK: '#F57C00',    // Darker orange
    ACCENT_LIGHT: '#FFE0B2',   // Light orange
    
    // Background Colors
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    BACKGROUND: '#F5F5F5',     // Light gray background
    SURFACE: '#FFFFFF',        // Card/surface background
    
    // Text Colors
    TEXT_PRIMARY: '#212121',   // Main text color
    TEXT_SECONDARY: '#757575', // Secondary text
    TEXT_DISABLED: '#BDBDBD',  // Disabled text
    TEXT_ON_PRIMARY: '#FFFFFF', // Text on primary color
    TEXT_ON_SECONDARY: '#FFFFFF', // Text on secondary color
    
    // Status Colors
    SUCCESS: '#4CAF50',        // Success green
    ERROR: '#F44336',          // Error red
    WARNING: '#FF9800',        // Warning orange
    INFO: '#2196F3',           // Info blue
    
    // Border & Divider
    BORDER: '#E0E0E0',         // Light border
    DIVIDER: '#F0F0F0',        // Divider line
    
    // Vehicle Type Colors
    BIKE_COLOR: '#4CAF50',     // Green for bikes
    CAR_COLOR: '#2196F3',      // Blue for cars
    
    // Map Colors
    MAP_ROUTE: '#4CAF50',      // Route line color
    MAP_PICKUP: '#FF5722',     // Pickup marker
    MAP_DESTINATION: '#4CAF50', // Destination marker
    MAP_DRIVER: '#2196F3',     // Driver marker
    
    // Subscription Colors
    PLAN_BASIC: '#9E9E9E',     // Basic plan
    PLAN_PREMIUM: '#FF9800',   // Premium plan
    PLAN_ULTIMATE: '#9C27B0',  // Ultimate plan
    
    // Eco Impact Colors
    ECO_CO2: '#4CAF50',        // CO2 saved
    ECO_TREE: '#8BC34A',       // Trees equivalent
    ECO_FUEL: '#FF9800',       // Fuel saved
    
    // Rating Colors
    RATING_STAR: '#FFC107',    // Star rating color
    RATING_EMPTY: '#E0E0E0',   // Empty star
    
    // Payment Colors
    PAYMENT_SUCCESS: '#4CAF50', // Successful payment
    PAYMENT_PENDING: '#FF9800', // Pending payment
    PAYMENT_FAILED: '#F44336',  // Failed payment
    
    // Transparent Colors
    TRANSPARENT: 'transparent',
    BLACK_50: 'rgba(0, 0, 0, 0.5)',
    BLACK_30: 'rgba(0, 0, 0, 0.3)',
    BLACK_10: 'rgba(0, 0, 0, 0.1)',
    WHITE_50: 'rgba(255, 255, 255, 0.5)',
    WHITE_30: 'rgba(255, 255, 255, 0.3)',
    WHITE_10: 'rgba(255, 255, 255, 0.1)',
    
    // Gradient Colors
    GRADIENT_PRIMARY: ['#4CAF50', '#388E3C'],
    GRADIENT_SECONDARY: ['#2196F3', '#1976D2'],
    GRADIENT_ACCENT: ['#FF9800', '#F57C00'],
    GRADIENT_ECO: ['#4CAF50', '#8BC34A', '#CDDC39'],
    
    // Shadow Colors
    SHADOW_LIGHT: 'rgba(0, 0, 0, 0.1)',
    SHADOW_MEDIUM: 'rgba(0, 0, 0, 0.2)',
    SHADOW_DARK: 'rgba(0, 0, 0, 0.3)',
    
    // Emergency Colors
    SOS_RED: '#D32F2F',        // Emergency SOS button
    SOS_BACKGROUND: '#FFEBEE', // Emergency background
    
    // Dark Mode Colors (for future implementation)
    DARK: {
      BACKGROUND: '#121212',
      SURFACE: '#1E1E1E',
      TEXT_PRIMARY: '#FFFFFF',
      TEXT_SECONDARY: '#B3B3B3',
      BORDER: '#333333',
    }
  };
  
  // Color utility functions
  export const getVehicleColor = (vehicleType) => {
    return vehicleType === 'bike' ? COLORS.BIKE_COLOR : COLORS.CAR_COLOR;
  };
  
  export const getStatusColor = (status) => {
    const statusColors = {
      'requested': COLORS.WARNING,
      'searching': COLORS.INFO,
      'driver_assigned': COLORS.PRIMARY,
      'driver_arriving': COLORS.SECONDARY,
      'driver_arrived': COLORS.SUCCESS,
      'in_progress': COLORS.ACCENT,
      'completed': COLORS.SUCCESS,
      'cancelled': COLORS.ERROR,
      'failed': COLORS.ERROR,
    };
    
    return statusColors[status] || COLORS.TEXT_SECONDARY;
  };
  
  export const getPaymentStatusColor = (status) => {
    const paymentColors = {
      'completed': COLORS.PAYMENT_SUCCESS,
      'pending': COLORS.PAYMENT_PENDING,
      'processing': COLORS.PAYMENT_PENDING,
      'failed': COLORS.PAYMENT_FAILED,
      'refunded': COLORS.INFO,
    };
    
    return paymentColors[status] || COLORS.TEXT_SECONDARY;
  };
  
  export const getSubscriptionColor = (planType) => {
    const planColors = {
      'basic': COLORS.PLAN_BASIC,
      'premium': COLORS.PLAN_PREMIUM,
      'ultimate': COLORS.PLAN_ULTIMATE,
    };
    
    return planColors[planType] || COLORS.PRIMARY;
  };
  
  // Color with opacity
  export const withOpacity = (color, opacity) => {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  export default COLORS;