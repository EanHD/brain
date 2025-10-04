/**
 * T007: File Upload Dropzone Component
 * 
 * Drag-and-drop file upload with visual feedback
 * Features:
 * - Drag and drop support
 * - Click to browse
 * - File type validation
 * - Size limit checking
 * - Preview thumbnails
 * - Progress indication
 * - Multiple file support
 */

export class FileDropzone {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      accept: '*/*', // File types to accept
      maxSize: 10 * 1024 * 1024, // 10MB default
      maxFiles: 10,
      multiple: true,
      showPreviews: true,
      onFilesAdded: null,
      onFileRemoved: null,
      onError: null,
      ...options
    };

    this.files = [];
    this.render();
    this.setupEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="file-dropzone">
        <input 
          type="file" 
          class="file-dropzone-input" 
          ${this.options.multiple ? 'multiple' : ''}
          accept="${this.options.accept}"
          hidden
        />
        
        <div class="file-dropzone-area">
          <div class="file-dropzone-icon">📁</div>
          <div class="file-dropzone-text">
            <p class="file-dropzone-title">Drag and drop files here</p>
            <p class="file-dropzone-subtitle">or click to browse</p>
          </div>
          <div class="file-dropzone-limits">
            <span>Max ${this.formatFileSize(this.options.maxSize)} per file</span>
            ${this.options.maxFiles ? ` · Up to ${this.options.maxFiles} files` : ''}
          </div>
        </div>
        
        ${this.options.showPreviews ? '<div class="file-dropzone-previews"></div>' : ''}
      </div>
    `;

    this.elements = {
      dropzone: this.container.querySelector('.file-dropzone'),
      input: this.container.querySelector('.file-dropzone-input'),
      area: this.container.querySelector('.file-dropzone-area'),
      previews: this.container.querySelector('.file-dropzone-previews')
    };
  }

  setupEventListeners() {
    // Click to browse
    this.elements.area.addEventListener('click', () => {
      this.elements.input.click();
    });

    // File input change
    this.elements.input.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    });

    // Drag and drop
    this.elements.area.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.add('dropzone-dragover');
    });

    this.elements.area.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.remove('dropzone-dragover');
    });

    this.elements.area.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.dropzone.classList.remove('dropzone-dragover');
      
      const files = Array.from(e.dataTransfer.files);
      this.handleFiles(files);
    });

    // Prevent default drag behavior on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      document.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });
  }

  handleFiles(newFiles) {
    // Validate file count
    if (this.options.maxFiles && this.files.length + newFiles.length > this.options.maxFiles) {
      this.showError(`Maximum ${this.options.maxFiles} files allowed`);
      return;
    }

    // Validate and process each file
    const validFiles = [];
    const errors = [];

    for (const file of newFiles) {
      // Check file size
      if (file.size > this.options.maxSize) {
        errors.push(`${file.name}: File too large (max ${this.formatFileSize(this.options.maxSize)})`);
        continue;
      }

      // Check file type if specified
      if (this.options.accept !== '*/*') {
        const acceptedTypes = this.options.accept.split(',').map(t => t.trim());
        const fileType = file.type || '';
        const fileExt = '.' + file.name.split('.').pop();
        
        const isAccepted = acceptedTypes.some(type => {
          if (type.endsWith('/*')) {
            const baseType = type.replace('/*', '');
            return fileType.startsWith(baseType);
          }
          return type === fileType || type === fileExt;
        });

        if (!isAccepted) {
          errors.push(`${file.name}: File type not accepted`);
          continue;
        }
      }

      validFiles.push(file);
    }

    // Show errors if any
    if (errors.length > 0) {
      this.showError(errors.join('\n'));
    }

    // Add valid files
    if (validFiles.length > 0) {
      this.addFiles(validFiles);
    }
  }

  addFiles(files) {
    files.forEach(file => {
      const fileData = {
        file,
        id: this.generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: null
      };

      this.files.push(fileData);
      
      // Create preview
      if (this.options.showPreviews) {
        this.createPreview(fileData);
      }
    });

    // Callback
    if (this.options.onFilesAdded) {
      this.options.onFilesAdded(files);
    }

    this.updateDropzoneState();
  }

  createPreview(fileData) {
    const preview = document.createElement('div');
    preview.className = 'file-preview';
    preview.dataset.fileId = fileData.id;

    // Determine preview type
    if (fileData.type.startsWith('image/')) {
      this.createImagePreview(preview, fileData);
    } else {
      this.createGenericPreview(preview, fileData);
    }

    this.elements.previews.appendChild(preview);
  }

  createImagePreview(preview, fileData) {
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `
        <div class="file-preview-image">
          <img src="${e.target.result}" alt="${fileData.name}" />
        </div>
        <div class="file-preview-info">
          <div class="file-preview-name">${this.truncateName(fileData.name, 20)}</div>
          <div class="file-preview-size">${this.formatFileSize(fileData.size)}</div>
        </div>
        <button class="file-preview-remove" data-file-id="${fileData.id}" title="Remove">
          ✕
        </button>
      `;
      
      // Add remove listener
      preview.querySelector('.file-preview-remove').addEventListener('click', () => {
        this.removeFile(fileData.id);
      });
    };
    reader.readAsDataURL(fileData.file);
  }

  createGenericPreview(preview, fileData) {
    const icon = this.getFileIcon(fileData.type);
    
    preview.innerHTML = `
      <div class="file-preview-icon">${icon}</div>
      <div class="file-preview-info">
        <div class="file-preview-name">${this.truncateName(fileData.name, 20)}</div>
        <div class="file-preview-size">${this.formatFileSize(fileData.size)}</div>
      </div>
      <button class="file-preview-remove" data-file-id="${fileData.id}" title="Remove">
        ✕
      </button>
    `;
    
    // Add remove listener
    preview.querySelector('.file-preview-remove').addEventListener('click', () => {
      this.removeFile(fileData.id);
    });
  }

  removeFile(fileId) {
    const index = this.files.findIndex(f => f.id === fileId);
    if (index === -1) return;

    const file = this.files[index];
    this.files.splice(index, 1);

    // Remove preview
    const preview = this.elements.previews.querySelector(`[data-file-id="${fileId}"]`);
    if (preview) {
      preview.remove();
    }

    // Callback
    if (this.options.onFileRemoved) {
      this.options.onFileRemoved(file);
    }

    this.updateDropzoneState();
  }

  updateDropzoneState() {
    if (this.files.length > 0) {
      this.elements.dropzone.classList.add('has-files');
    } else {
      this.elements.dropzone.classList.remove('has-files');
    }
  }

  showError(message) {
    if (this.options.onError) {
      this.options.onError(message);
    } else {
      alert(message);
    }
  }

  getFileIcon(type) {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎥';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📽️';
    if (type.includes('zip') || type.includes('archive')) return '📦';
    if (type.includes('text')) return '📃';
    return '📎';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  truncateName(name, maxLength) {
    if (name.length <= maxLength) return name;
    const ext = name.split('.').pop();
    const nameWithoutExt = name.substring(0, name.length - ext.length - 1);
    const truncated = nameWithoutExt.substring(0, maxLength - ext.length - 4);
    return truncated + '...' + ext;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getFiles() {
    return this.files.map(f => f.file);
  }

  clear() {
    this.files = [];
    if (this.elements.previews) {
      this.elements.previews.innerHTML = '';
    }
    this.updateDropzoneState();
  }

  destroy() {
    // Clean up event listeners
    this.container.innerHTML = '';
  }
}

export default FileDropzone;
