// Error handling and validation utilities for PhoenyxColor
import { toast } from 'svelte-sonner';

export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  STORAGE = 'storage',
  FILE_PROCESSING = 'file_processing',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Handle and log application errors
   */
  handleError(error: Error | AppError | any, type: ErrorType = ErrorType.UNKNOWN): void {
    let appError: AppError;

    if (this.isAppError(error)) {
      appError = error;
    } else if (error instanceof Error) {
      appError = {
        type,
        message: error.message,
        details: error,
        timestamp: new Date(),
        stack: error.stack
      };
    } else {
      appError = {
        type,
        message: String(error),
        details: error,
        timestamp: new Date()
      };
    }

    // Log error
    this.logError(appError);

    // Show user-friendly message
    this.showErrorToUser(appError);

    // Report to console in development
    if (import.meta.env.DEV) {
      console.error('Application Error:', appError);
    }
  }

  /**
   * Validate color hex values
   */
  validateHexColor(color: string): ValidationResult {
    const rules: ValidationRule<string>[] = [
      {
        validate: (value) => typeof value === 'string',
        message: 'Color must be a string'
      },
      {
        validate: (value) => value.length > 0,
        message: 'Color cannot be empty'
      },
      {
        validate: (value) => /^#[0-9A-Fa-f]{6}$/.test(value),
        message: 'Color must be a valid hex format (#RRGGBB)'
      }
    ];

    return this.runValidation(color, rules);
  }

  /**
   * Validate palette data
   */
  validatePalette(palette: any): ValidationResult {
    const rules: ValidationRule<any>[] = [
      {
        validate: (value) => value && typeof value === 'object',
        message: 'Palette must be an object'
      },
      {
        validate: (value) => typeof value.name === 'string' && value.name.length > 0,
        message: 'Palette must have a valid name'
      },
      {
        validate: (value) => Array.isArray(value.colors),
        message: 'Palette must have a colors array'
      },
      {
        validate: (value) => value.colors.length <= (value.maxSlots || 20),
        message: 'Palette has too many colors for its slot limit'
      },
      {
        validate: (value) => value.colors.every((color: string) => this.validateHexColor(color).isValid),
        message: 'All palette colors must be valid hex colors'
      }
    ];

    return this.runValidation(palette, rules);
  }

  /**
   * Validate gradient data
   */
  validateGradient(gradient: any): ValidationResult {
    const rules: ValidationRule<any>[] = [
      {
        validate: (value) => value && typeof value === 'object',
        message: 'Gradient must be an object'
      },
      {
        validate: (value) => typeof value.name === 'string' && value.name.length > 0,
        message: 'Gradient must have a valid name'
      },
      {
        validate: (value) => ['linear', 'radial', 'angular'].includes(value.type),
        message: 'Gradient type must be linear, radial, or angular'
      },
      {
        validate: (value) => Array.isArray(value.stops) && value.stops.length >= 2,
        message: 'Gradient must have at least 2 color stops'
      },
      {
        validate: (value) => value.stops.every((stop: any) => 
          stop && 
          typeof stop.position === 'number' && 
          stop.position >= 0 && 
          stop.position <= 100 &&
          this.validateHexColor(stop.color).isValid
        ),
        message: 'All gradient stops must have valid positions (0-100) and colors'
      }
    ];

    return this.runValidation(gradient, rules);
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file: File): ValidationResult {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    const rules: ValidationRule<File>[] = [
      {
        validate: (value) => value instanceof File,
        message: 'Must be a valid file'
      },
      {
        validate: (value) => value.size <= maxSize,
        message: `File size must be less than ${maxSize / 1024 / 1024}MB`
      },
      {
        validate: (value) => allowedTypes.includes(value.type),
        message: 'File must be a valid image format (JPEG, PNG, GIF, WebP)'
      },
      {
        validate: (value) => value.name.length > 0,
        message: 'File must have a valid name'
      }
    ];

    return this.runValidation(file, rules);
  }

  /**
   * Validate reference image data
   */
  validateReferenceImage(reference: any): ValidationResult {
    const rules: ValidationRule<any>[] = [
      {
        validate: (value) => value && typeof value === 'object',
        message: 'Reference must be an object'
      },
      {
        validate: (value) => typeof value.name === 'string' && value.name.length > 0,
        message: 'Reference must have a valid name'
      },
      {
        validate: (value) => typeof value.src === 'string' && value.src.length > 0,
        message: 'Reference must have a valid source URL'
      },
      {
        validate: (value) => 
          value.position && 
          typeof value.position.x === 'number' && 
          typeof value.position.y === 'number',
        message: 'Reference must have valid position coordinates'
      },
      {
        validate: (value) => 
          typeof value.scale === 'number' && 
          value.scale > 0 && 
          value.scale <= 5,
        message: 'Reference scale must be between 0 and 5'
      },
      {
        validate: (value) => 
          typeof value.opacity === 'number' && 
          value.opacity >= 0 && 
          value.opacity <= 1,
        message: 'Reference opacity must be between 0 and 1'
      }
    ];

    return this.runValidation(reference, rules);
  }

  /**
   * Sanitize user input
   */
  sanitizeInput(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, ''); // Remove potential HTML tags
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100);
  }

  /**
   * Check if browser supports required features
   */
  checkBrowserSupport(): { supported: boolean; missing: string[] } {
    const requiredFeatures = [
      { name: 'Canvas', check: () => !!document.createElement('canvas').getContext },
      { name: 'File API', check: () => 'File' in window },
      { name: 'Blob', check: () => 'Blob' in window },
      { name: 'URL.createObjectURL', check: () => 'URL' in window && 'createObjectURL' in URL },
      { name: 'localStorage', check: () => 'localStorage' in window }
    ];

    const missing = requiredFeatures
      .filter(feature => !feature.check())
      .map(feature => feature.name);

    return {
      supported: missing.length === 0,
      missing
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; byType: Record<ErrorType, number> } {
    const byType = Object.values(ErrorType).reduce((acc, type) => {
      acc[type] = this.errorLog.filter(error => error.type === type).length;
      return acc;
    }, {} as Record<ErrorType, number>);

    return {
      total: this.errorLog.length,
      byType
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    toast.info('Error log cleared');
  }

  /**
   * Export error log
   */
  exportErrorLog(): void {
    const data = {
      exportedAt: new Date().toISOString(),
      errors: this.errorLog,
      stats: this.getErrorStats()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phoenyxcolor-errors-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Error log exported');
  }

  /**
   * Private helper methods
   */
  private isAppError(error: any): error is AppError {
    return error && 
           typeof error.type === 'string' && 
           typeof error.message === 'string' && 
           error.timestamp instanceof Date;
  }

  private logError(error: AppError): void {
    this.errorLog.push(error);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  private showErrorToUser(error: AppError): void {
    const userMessage = this.getUserFriendlyMessage(error);
    
    switch (error.type) {
      case ErrorType.VALIDATION:
        toast.warning(userMessage);
        break;
      case ErrorType.NETWORK:
        toast.error(`Network Error: ${userMessage}`);
        break;
      case ErrorType.STORAGE:
        toast.error(`Storage Error: ${userMessage}`);
        break;
      case ErrorType.FILE_PROCESSING:
        toast.error(`File Error: ${userMessage}`);
        break;
      case ErrorType.PERMISSION:
        toast.error(`Permission Error: ${userMessage}`);
        break;
      default:
        toast.error(`Error: ${userMessage}`);
    }
  }

  private getUserFriendlyMessage(error: AppError): string {
    // Map technical errors to user-friendly messages
    const messageMap: Record<string, string> = {
      'Failed to fetch': 'Network connection failed. Please check your internet connection.',
      'QuotaExceededError': 'Storage space is full. Please clear some data.',
      'NotAllowedError': 'Permission denied. Please allow the required permissions.',
      'SecurityError': 'Security restriction encountered.',
      'NetworkError': 'Network error occurred. Please try again.'
    };

    return messageMap[error.message] || error.message;
  }

  private runValidation<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];

    for (const rule of rules) {
      try {
        if (!rule.validate(value)) {
          errors.push(rule.message);
        }
      } catch (error) {
        errors.push(`Validation error: ${error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance(); 