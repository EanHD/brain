/**
 * File Processor Service
 * Handles file upload, text extraction, and metadata processing
 * Supports: PDF, Images (OCR), DOCX, plain text
 */

import { generateULID } from '../ulid.js';
import db from '../db.js';
import aiService from '../ai.js';
import { getEventBus, APPLICATION_EVENTS } from '../events-utility.js';

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Supported MIME types
const SUPPORTED_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'text',
  'text/markdown': 'text'
};

/**
 * File Processor Service
 */
class FileProcessor {
  constructor() {
    this.eventBus = getEventBus();
    this.processingQueue = [];
  }

  /**
   * Process a single file
   * @param {Blob} blob - File blob
   * @param {string} filename - Original filename
   * @returns {Promise<{text: string, type: string, metadata: object}>}
   */
  async processFile(blob, filename) {
    // Validate file type
    if (!SUPPORTED_TYPES[blob.type]) {
      throw new Error(`Unsupported file type: ${blob.type}. Supported types: ${Object.keys(SUPPORTED_TYPES).join(', ')}`);
    }

    // Validate file size
    if (blob.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const fileType = SUPPORTED_TYPES[blob.type];

    // Route to appropriate processor
    let result;
    switch (fileType) {
      case 'pdf':
        result = await this.processPDF(blob);
        break;
      case 'image':
        result = await this.processImage(blob);
        break;
      case 'docx':
        result = await this.processDOCX(blob);
        break;
      case 'text':
        result = await this.processText(blob);
        break;
      default:
        throw new Error(`No processor for file type: ${fileType}`);
    }

    result.type = fileType;
    result.filename = filename;
    result.mimeType = blob.type;
    result.size = blob.size;

    return result;
  }

  /**
   * Process PDF file
   * @param {Blob} blob - PDF file blob
   * @returns {Promise<{text: string, pageCount: number, metadata: object}>}
   */
  async processPDF(blob) {
    try {
      // Load pdfjs-dist dynamically
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker path
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

      // Load PDF
      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const pageCount = pdf.numPages;
      const textParts = [];

      // Extract text from all pages
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        textParts.push(pageText);
      }

      // Get metadata
      const metadata = await pdf.getMetadata();

      return {
        text: textParts.join('\n\n'),
        pageCount,
        metadata: {
          title: metadata.info?.Title || '',
          author: metadata.info?.Author || '',
          subject: metadata.info?.Subject || '',
          created: metadata.info?.CreationDate || '',
          modified: metadata.info?.ModDate || ''
        }
      };
    } catch (error) {
      console.error('PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  /**
   * Process image file with OCR
   * @param {Blob} blob - Image file blob
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async processImage(blob) {
    try {
      // Load Tesseract.js dynamically
      const Tesseract = await import('tesseract.js');

      // Perform OCR
      const result = await Tesseract.recognize(blob, 'eng', {
        logger: (m) => {
          // Progress logging
          if (m.status === 'recognizing text') {
            console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        metadata: {
          language: 'eng',
          blocks: result.data.blocks?.length || 0
        }
      };
    } catch (error) {
      console.error('Image OCR error:', error);
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  /**
   * Process DOCX file
   * @param {Blob} blob - DOCX file blob
   * @returns {Promise<{text: string, metadata: object}>}
   */
  async processDOCX(blob) {
    try {
      // Load Mammoth.js dynamically
      const mammoth = await import('mammoth');

      // Convert to array buffer
      const arrayBuffer = await blob.arrayBuffer();

      // Extract text
      const result = await mammoth.extractRawText({ arrayBuffer });

      return {
        text: result.value,
        metadata: {
          messages: result.messages || [],
          extracted: true
        }
      };
    } catch (error) {
      console.error('DOCX processing error:', error);
      throw new Error(`Failed to process DOCX: ${error.message}`);
    }
  }

  /**
   * Process plain text file
   * @param {Blob} blob - Text file blob
   * @returns {Promise<{text: string, metadata: object}>}
   */
  async processText(blob) {
    try {
      const text = await blob.text();

      return {
        text,
        metadata: {
          encoding: 'utf-8',
          lines: text.split('\n').length
        }
      };
    } catch (error) {
      console.error('Text processing error:', error);
      throw new Error(`Failed to process text: ${error.message}`);
    }
  }

  /**
   * Process and save file to database
   * @param {Blob} blob - File blob
   * @param {string} filename - Original filename
   * @returns {Promise<string>} File ID
   */
  async processAndSaveFile(blob, filename) {
    try {
      // Process file to extract text
      const processed = await this.processFile(blob, filename);

      // Generate AI tags from extracted text
      let tags = [];
      if (processed.text && processed.text.trim().length > 0) {
        try {
          tags = await aiService.generateTags(processed.text);
        } catch (error) {
          console.warn('AI tagging failed, continuing without tags:', error);
        }
      }

      // Create file record
      const fileId = generateULID();
      const fileRecord = {
        id: fileId,
        name: filename,
        type: blob.type,
        size: blob.size,
        blob: blob, // Store the actual file blob
        extracted_text: processed.text,
        metadata: {
          ...processed.metadata,
          pageCount: processed.pageCount,
          confidence: processed.confidence,
          processed_at: Date.now()
        },
        tags,
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false
      };

      // Save to database
      await db.files.add(fileRecord);

      // Emit event
      this.eventBus.emit(APPLICATION_EVENTS.FILE_PROCESSED, {
        fileId,
        filename,
        type: processed.type,
        size: blob.size,
        tags
      });

      return fileId;
    } catch (error) {
      console.error('File processing and save error:', error);
      
      // Emit error event
      this.eventBus.emit(APPLICATION_EVENTS.ERROR, {
        type: 'file_processing',
        message: error.message,
        filename
      });

      throw error;
    }
  }

  /**
   * Process multiple files in batch
   * @param {File[]} files - Array of files to process
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array<{fileId: string, filename: string, error?: string}>>}
   */
  async processBatch(files, onProgress) {
    const results = [];
    let completed = 0;

    for (const file of files) {
      try {
        const fileId = await this.processAndSaveFile(file, file.name);
        results.push({
          fileId,
          filename: file.name,
          success: true
        });
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error.message
        });
      }

      completed++;
      if (onProgress) {
        onProgress({
          completed,
          total: files.length,
          progress: (completed / files.length) * 100
        });
      }
    }

    return results;
  }

  /**
   * Get file by ID
   * @param {string} fileId - File ID
   * @returns {Promise<object>} File record
   */
  async getFile(fileId) {
    return await db.files.get(fileId);
  }

  /**
   * Delete file
   * @param {string} fileId - File ID
   */
  async deleteFile(fileId) {
    await db.files.update(fileId, {
      is_deleted: true,
      updated_at: Date.now()
    });

    this.eventBus.emit(APPLICATION_EVENTS.FILE_DELETED, { fileId });
  }

  /**
   * Search files by text content
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching files
   */
  async searchFiles(query) {
    const allFiles = await db.files
      .where('is_deleted')
      .equals(false)
      .toArray();

    const lowerQuery = query.toLowerCase();

    return allFiles.filter(file => {
      return (
        file.name.toLowerCase().includes(lowerQuery) ||
        (file.extracted_text && file.extracted_text.toLowerCase().includes(lowerQuery)) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
      );
    });
  }
}

// Export singleton instance
const fileProcessor = new FileProcessor();
export default fileProcessor;

// Export individual methods for testing
export const processPDF = (blob) => fileProcessor.processPDF(blob);
export const processImage = (blob) => fileProcessor.processImage(blob);
export const processDOCX = (blob) => fileProcessor.processDOCX(blob);
export const processFile = (blob, filename) => fileProcessor.processFile(blob, filename);
export const processAndSaveFile = (blob, filename) => fileProcessor.processAndSaveFile(blob, filename);
