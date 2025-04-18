/**
 * FileUpload Class - Configurable file upload component for Django Widgets
 * Adapts the standalone example to work with the structure rendered by file_input.html
 */
class FileUpload {
  /**
   * Create a new FileUpload instance
   * @param {HTMLElement} containerElement - The main container element (.file-upload-container) rendered by the widget.
   */
  constructor(containerElement) {
    this.container = containerElement;
    if (!this.container) {
      console.error("FileUpload: Container element not provided.");
      return;
    }

    // --- Configuration ---
    try {
      this.config = JSON.parse(this.container.dataset.config || '{}');
    } catch (e) {
      console.error("FileUpload: Failed to parse config JSON.", e, this.container);
      this.config = {}; // Use defaults
    }

    // Merge with defaults (ensure all expected keys exist)
    const defaultOptions = {
      acceptedFormats: null, // Let input's 'accept' handle basic filtering initially
      maxFileSize: 10 * 1024 * 1024, // 10MB
      sizeCalculationMode: 1, // 1: per file, 2: total
      maxFileCount: this.container.querySelector('.file-input')?.hasAttribute('multiple') ? Infinity : 1, // Default based on 'multiple'
    };
    this.config = { ...defaultOptions, ...this.config };

    // --- Element References (using selectors relative to container) ---
    this.dropzone = this.container.querySelector('.dropzone');
    this.fileInput = this.container.querySelector('.file-input'); // The hidden native input
    this.previewContainer = this.container.querySelector('.file-preview-container');
    this.errorMessage = this.container.querySelector('.file-error-text');
    this.selectFilesBtn = this.container.querySelector('.file-action-button[id$="_select_btn"]'); // Find by partial ID ending
    this.clearFilesBtn = this.container.querySelector('.file-action-button[id$="_clear_btn"]');
    this.restrictionsInfo = this.container.querySelector('.file-restrictions-info');

    // --- Validate Elements ---
    if (!this.dropzone || !this.fileInput || !this.previewContainer || !this.errorMessage || !this.selectFilesBtn || !this.clearFilesBtn || !this.restrictionsInfo) {
      console.error("FileUpload initialization failed: One or more required child elements not found within:", this.container);
      // You could add fallback logic or disable the widget here.
      this.container.style.border = '2px solid red'; // Visual indicator of failure
      return;
    }

    // --- State ---
    this.uploadedFiles = []; // Array to hold { id: string, file: File } objects
    this.fileIdCounter = 0; // Simple counter for unique preview IDs

    // --- Initialization ---
    this.setupEventListeners();
    this.updateRestrictionsInfo();
    console.log(`FileUpload initialized for ${this.fileInput.id}`, this.config);
  }

  // --- Methods (Copied and adapted from the example) ---

  generateFileId() {
    return `file-${this.fileInput.id}-${this.fileIdCounter++}`; // Make ID more specific
  }

  setupEventListeners() {
    // File input change event
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.processFiles(e.target.files);
        // Reset input value to allow selecting the same file again
        e.target.value = '';
      }
    });

    // Select files button
    this.selectFilesBtn.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Clear files button
    this.clearFilesBtn.addEventListener('click', () => {
      this.clearAllFiles();
    });

    // Make the entire dropzone clickable (excluding the button inside)
    this.dropzone.addEventListener('click', (e) => {
      if (!e.target.closest('.dropzone-button') && e.target !== this.fileInput) {
        this.fileInput.click();
      }
    });

    // Make the button inside dropzone trigger the file input
    const browseButton = this.dropzone.querySelector('.dropzone-button');
    if (browseButton) {
      browseButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.fileInput.click();
      });
    }

    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, this.preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, () => this.dropzone.classList.add('drag-over'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, () => this.dropzone.classList.remove('drag-over'), false);
    });

    this.dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        this.processFiles(files);
      }
    });

    // Event delegation for remove buttons
    this.previewContainer.addEventListener('click', (e) => {
      const removeButton = e.target.closest('.file-remove');
      if (removeButton) {
        const previewItem = removeButton.closest('.file-preview-item');
        if (previewItem && previewItem.dataset.fileId) {
          this.removeFile(previewItem.dataset.fileId);
        }
      }
    });
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  updateRestrictionsInfo() {
    const sizeLimit = this.config.maxFileSize;
    const countLimit = this.config.maxFileCount;
    const formats = this.config.acceptedFormats;

    let restrictions = [];

    if (sizeLimit > 0) {
      const sizeText = this.formatFileSize(sizeLimit);
      const modeText = this.config.sizeCalculationMode === 1 ? `per file` : `total`;
      restrictions.push(`Size limit: ${sizeText} ${modeText}.`);
    }

    if (Number.isFinite(countLimit) && countLimit > 0) {
      restrictions.push(`Max ${countLimit} file(s).`);
    }

    if (formats) {
      let formatsText = 'various formats';
      let acceptedFormatsValue = formats;
      if (Array.isArray(acceptedFormatsValue)) {
        acceptedFormatsValue = acceptedFormatsValue.join(',');
      }
      // Basic formatting for display - refine as needed
      formatsText = acceptedFormatsValue
        .replace(/image\/\*/g, 'Images')
        .replace(/video\/\*/g, 'Videos')
        .replace(/audio\/\*/g, 'Audio')
        .replace(/application\/pdf/g, 'PDF')
        .replace(/application\/zip/g, 'ZIP')
        .replace(/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/g, 'DOCX')
        .replace(/application\/msword/g, 'DOC')
        .replace(/application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/g, 'XLSX')
        .replace(/application\/vnd\.ms-excel/g, 'XLS')
        .replace(/\./g, '') // Remove leading dots if format is like .pdf
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(s => s)
        .join(', ');
      if (formatsText) {
        restrictions.push(`Accepted: ${formatsText}.`);
      }
    }

    this.restrictionsInfo.textContent = restrictions.join(' ') || 'No specific restrictions defined.';
  }

  formatFileSize(bytes, decimals = 1) {
    if (!+bytes) return '0 B'; // Use !+bytes to handle undefined, null, 0
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  getFileIcon(fileType) {
    if (!fileType) return 'fa-file';
    if (fileType.startsWith('image/')) return 'fa-image';
    if (fileType.startsWith('video/')) return 'fa-file-video';
    if (fileType.startsWith('audio/')) return 'fa-file-audio';
    if (fileType === 'application/pdf') return 'fa-file-pdf';
    if (fileType.includes('word')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('presentation')) return 'fa-file-powerpoint'; // Broader match
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return 'fa-file-archive';
    if (fileType.startsWith('text/')) return 'fa-file-alt';
    return 'fa-file';
  }

  createFilePreview(file, fileId) {
    const filePreview = document.createElement('div');
    filePreview.className = 'file-preview-item';
    filePreview.dataset.fileId = fileId;

    const nameParts = file.name.split('.');
    const fileExtension = nameParts.length > 1 ? nameParts.pop().toUpperCase() : 'N/A';

    filePreview.innerHTML = `
      <div class="file-icon">
        <i class="fas ${this.getFileIcon(file.type)}"></i>
      </div>
      <div class="file-info">
        <div class="file-name" title="${file.name}">${file.name}</div>
        <div class="file-meta">
          <span class="file-size">${this.formatFileSize(file.size)}</span>
          ${fileExtension !== 'N/A' ? `<span class="file-type">${fileExtension}</span>` : ''}
        </div>
      </div>
      <button type="button" class="file-remove" title="Remove file">
        <i class="fas fa-times"></i>
      </button>
      <div class="file-progress" style="width: 0%; opacity: 1;"></div>
    `;
    return filePreview;
  }

  animateProgress(previewElement) {
    const progressBar = previewElement.querySelector('.file-progress');
    if (!progressBar) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => { // Double RAF for good measure
        progressBar.style.width = '100%';
      });
    });

    // Simple timeout based fade-out matching CSS transition
    // Using transitionend can be complex if multiple transitions are present
    setTimeout(() => {
      if (progressBar) progressBar.style.opacity = '0';
    }, 800); // width 0.4s + opacity delay 0.4s
  }

  calculateTotalSize() {
    return this.uploadedFiles.reduce((total, fileData) => total + fileData.file.size, 0);
  }

  clearAllFiles() {
    this.uploadedFiles = [];
    this.previewContainer.innerHTML = '';
    this.errorMessage.textContent = '';
    this.errorMessage.classList.add('hidden');
    this.fileIdCounter = 0;
    // Important: Clear the native file input's value as well
    this.fileInput.value = '';
    // Trigger a change event on the native input if needed for form validation libraries
    // this.fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  removeFile(fileId) {
    const elementToRemove = this.previewContainer.querySelector(`.file-preview-item[data-file-id="${fileId}"]`);
    if (elementToRemove) {
      elementToRemove.style.transition = 'opacity 0.3s ease';
      elementToRemove.style.opacity = '0';
      setTimeout(() => {
        elementToRemove.remove();
      }, 300);
    }

    const indexToRemove = this.uploadedFiles.findIndex(fileData => fileData.id === fileId);
    if (indexToRemove > -1) {
      this.uploadedFiles.splice(indexToRemove, 1);
    }

    // Update the native file input's FileList (BEST EFFORT - usually read-only)
    // This is tricky and often not fully supported. The primary way to handle
    // removal is usually during the AJAX upload preparation in init.js.
    this.updateNativeInputFileList();


    this.validatePostRemoval();
  }

  updateNativeInputFileList() {
    // WARNING: Directly manipulating the FileList of an <input type="file"> is generally
    // not allowed by browsers for security reasons. The FileList is read-only.
    // The best practice is to manage the files in your JS array (this.uploadedFiles)
    // and construct the FormData for submission based on that array.
    // This method is left as a placeholder to indicate where you *would* try this,
    // but it likely won't work reliably across browsers.

    // console.log("Attempting to update native FileList (usually read-only)...");
    const dataTransfer = new DataTransfer();
    this.uploadedFiles.forEach(fileData => {
      dataTransfer.items.add(fileData.file);
    });
    this.fileInput.files = dataTransfer.files;
    // console.log("Native files count after update attempt:", this.fileInput.files.length);
  }

  validatePostRemoval() {
    // Re-run checks based on the current state
    let errorStillExists = false;
    let currentErrors = [];
    const currentFileCount = this.uploadedFiles.length;
    const maxFiles = this.config.maxFileCount;
    const maxSize = this.config.maxFileSize;

    if (Number.isFinite(maxFiles) && currentFileCount > maxFiles) {
      errorStillExists = true;
      currentErrors.push(`Maximum file count (${maxFiles}) still exceeded.`);
    }

    if (this.config.sizeCalculationMode === 2) {
      const currentTotalSize = this.calculateTotalSize();
      if (currentTotalSize > maxSize) {
        errorStillExists = true;
        currentErrors.push(`Total size (${this.formatFileSize(currentTotalSize)}) still exceeds limit (${this.formatFileSize(maxSize)}).`);
      }
    }

    // Update error display
    if (errorStillExists) {
      this.errorMessage.textContent = currentErrors.join(' ');
      this.errorMessage.classList.remove('hidden');
    } else {
      this.errorMessage.textContent = '';
      this.errorMessage.classList.add('hidden');
    }
  }


  processFiles(files) {
    let currentErrors = [];
    let filesToAdd = [];
    let totalNewSize = 0;
    const currentFileCount = this.uploadedFiles.length;
    const maxFiles = this.config.maxFileCount;
    const maxSize = this.config.maxFileSize;

    // --- Pre-checks for the incoming batch ---
    if (Number.isFinite(maxFiles) && currentFileCount + files.length > maxFiles) {
      currentErrors.push(`Cannot add ${files.length} file(s). Max ${maxFiles} files allowed (already have ${currentFileCount}).`);
    } else {
      Array.from(files).forEach(file => {
        let fileIsValid = true;

        // Duplicate Check
        const isDuplicate = this.uploadedFiles.some(existing => existing.file.name === file.name && existing.file.size === file.size);
        if (isDuplicate) {
          console.warn(`Skipping duplicate file: ${file.name}`);
          fileIsValid = false;
        }

        // Per-File Size Check (Mode 1)
        if (fileIsValid && this.config.sizeCalculationMode === 1 && file.size > maxSize) {
          currentErrors.push(`File "${file.name}" (${this.formatFileSize(file.size)}) exceeds size limit (${this.formatFileSize(maxSize)}).`);
          fileIsValid = false;
        }

        // TODO: Add more robust type checking here if the 'accept' attribute isn't sufficient
        // if (fileIsValid && !this.isValidFileType(file)) { ... }

        if (fileIsValid) {
          filesToAdd.push(file);
          totalNewSize += file.size;
        }
      });
    }

    // Total Size Check (Mode 2)
    if (this.config.sizeCalculationMode === 2 && filesToAdd.length > 0) {
      const currentTotalSize = this.calculateTotalSize();
      if (currentTotalSize + totalNewSize > maxSize) {
        currentErrors.push(`Adding files would exceed total size limit (${this.formatFileSize(maxSize)}). Current: ${this.formatFileSize(currentTotalSize)}`);
        filesToAdd = []; // Prevent adding if total limit exceeded
      }
    }

    // --- Update UI ---
    if (currentErrors.length > 0) {
      this.errorMessage.textContent = currentErrors.join(' ');
      this.errorMessage.classList.remove('hidden');
    } else {
      this.errorMessage.textContent = '';
      this.errorMessage.classList.add('hidden');
    }

    // --- Add valid files ---
    if (filesToAdd.length > 0) {
      // If only 1 file allowed, clear existing first
      if (this.config.maxFileCount === 1 && this.uploadedFiles.length > 0) {
        this.clearAllFiles();
      }

      filesToAdd.forEach(file => {
        // Double-check count again in case maxFileCount is 1 and we just cleared
        if (Number.isFinite(maxFiles) && this.uploadedFiles.length >= maxFiles) {
          if (!currentErrors.includes(`Maximum file count (${maxFiles}) reached.`)) { // Avoid duplicate error
            currentErrors.push(`Maximum file count (${maxFiles}) reached.`);
            this.errorMessage.textContent = currentErrors.join(' ');
            this.errorMessage.classList.remove('hidden');
          }
          return; // Stop adding more files
        }

        const fileId = this.generateFileId();
        const fileData = { id: fileId, file: file };
        this.uploadedFiles.push(fileData);

        const previewElement = this.createFilePreview(file, fileId);
        this.previewContainer.appendChild(previewElement);
        this.animateProgress(previewElement);
      });

      // Update the native input's FileList (Best Effort)
      this.updateNativeInputFileList();
    }

    // --- Trigger change event on native input ---
    // This helps form validation libraries or other scripts detect a change.
    // It might not reflect the drag-dropped files correctly in form submission
    // without AJAX, but it signals that *something* happened.
    this.fileInput.dispatchEvent(new Event('change', { bubbles: true }));

  }

  // Method to get the list of managed File objects
  getFiles() {
    return this.uploadedFiles.map(fileData => fileData.file);
  }

} // End FileUpload Class

// Export if using modules
export { FileUpload };