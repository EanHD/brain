/**
 * Canvas Editor Component
 * Free-form canvas-style editor supporting text, drawings, and media
 * 
 * Features:
 * - Text blocks with contenteditable divs
 * - Drawing layer with HTML5 Canvas
 * - Media embedding (images, files)
 * - Free-form positioning and resizing
 * - Touch gestures (pinch zoom, pan)
 * - Keyboard shortcuts
 * - Export/import to JSON
 */

import { getEventBus } from '../events-utility.js';
import { generateULID } from '../ulid.js';

/**
 * Canvas Editor class
 */
class CanvasEditor {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.eventBus = getEventBus();
    
    // Canvas state
    this.elements = new Map(); // id -> element
    this.selectedElement = null;
    this.mode = 'select'; // 'select', 'text', 'draw', 'image'
    this.scale = 1;
    this.panOffset = { x: 0, y: 0 };
    
    // Drawing state
    this.isDrawing = false;
    this.currentStroke = [];
    this.drawColor = '#000000';
    this.drawWidth = 2;
    
    // Touch state
    this.touchStartDist = 0;
    this.lastTouchPoint = null;
    
    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;
    
    // Bound handlers
    this._boundHandlers = {
      mouseDown: this._handleMouseDown.bind(this),
      mouseMove: this._handleMouseMove.bind(this),
      mouseUp: this._handleMouseUp.bind(this),
      touchStart: this._handleTouchStart.bind(this),
      touchMove: this._handleTouchMove.bind(this),
      touchEnd: this._handleTouchEnd.bind(this),
      keyDown: this._handleKeyDown.bind(this)
    };
  }

  /**
   * Initialize canvas editor
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Configuration options
   */
  async initialize(container, options = {}) {
    this.container = container;
    this.options = {
      width: options.width || 2000,
      height: options.height || 2000,
      backgroundColor: options.backgroundColor || '#ffffff',
      ...options
    };
    
    this._createCanvas();
    this._attachEventListeners();
    this._render();
    
    console.log('✅ Canvas editor initialized');
  }

  /**
   * Create canvas structure
   * @private
   */
  _createCanvas() {
    this.container.innerHTML = `
      <div class="canvas-editor">
        <div class="canvas-toolbar">
          <div class="tool-group">
            <button class="tool-btn active" data-mode="select" title="Select (V)">
              <span class="icon">↖</span>
            </button>
            <button class="tool-btn" data-mode="text" title="Text (T)">
              <span class="icon">T</span>
            </button>
            <button class="tool-btn" data-mode="draw" title="Draw (D)">
              <span class="icon">✏️</span>
            </button>
            <button class="tool-btn" data-mode="image" title="Image (I)">
              <span class="icon">🖼️</span>
            </button>
          </div>
          
          <div class="tool-group">
            <button class="tool-btn" data-action="undo" title="Undo (Cmd+Z)">
              <span class="icon">↶</span>
            </button>
            <button class="tool-btn" data-action="redo" title="Redo (Cmd+Shift+Z)">
              <span class="icon">↷</span>
            </button>
          </div>
          
          <div class="tool-group">
            <input type="color" class="color-picker" value="${this.drawColor}" title="Color">
            <input type="range" class="width-slider" min="1" max="10" value="${this.drawWidth}" title="Width">
          </div>
          
          <div class="tool-group">
            <button class="tool-btn" data-action="zoom-in" title="Zoom In (+)">
              <span class="icon">+</span>
            </button>
            <button class="tool-btn" data-action="zoom-out" title="Zoom Out (-)">
              <span class="icon">−</span>
            </button>
            <button class="tool-btn" data-action="zoom-reset" title="Reset Zoom (0)">
              <span class="icon">100%</span>
            </button>
          </div>
          
          <div class="tool-group">
            <button class="tool-btn" data-action="export" title="Export">
              <span class="icon">💾</span>
            </button>
          </div>
        </div>
        
        <div class="canvas-viewport">
          <div class="canvas-container" style="width: ${this.options.width}px; height: ${this.options.height}px;">
            <canvas class="canvas-layer" width="${this.options.width}" height="${this.options.height}"></canvas>
            <div class="elements-layer"></div>
          </div>
        </div>
      </div>
    `;
    
    this.canvas = this.container.querySelector('.canvas-layer');
    this.ctx = this.canvas.getContext('2d');
    this.elementsLayer = this.container.querySelector('.elements-layer');
    this.viewport = this.container.querySelector('.canvas-viewport');
    
    // Set canvas background
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Attach event listeners
   * @private
   */
  _attachEventListeners() {
    // Toolbar buttons
    this.container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
    
    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this._handleAction(btn.dataset.action));
    });
    
    // Color and width controls
    const colorPicker = this.container.querySelector('.color-picker');
    colorPicker.addEventListener('change', (e) => {
      this.drawColor = e.target.value;
    });
    
    const widthSlider = this.container.querySelector('.width-slider');
    widthSlider.addEventListener('input', (e) => {
      this.drawWidth = parseInt(e.target.value);
    });
    
    // Canvas interactions
    this.canvas.addEventListener('mousedown', this._boundHandlers.mouseDown);
    this.canvas.addEventListener('mousemove', this._boundHandlers.mouseMove);
    this.canvas.addEventListener('mouseup', this._boundHandlers.mouseUp);
    this.canvas.addEventListener('mouseleave', this._boundHandlers.mouseUp);
    
    // Touch events
    this.canvas.addEventListener('touchstart', this._boundHandlers.touchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._boundHandlers.touchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._boundHandlers.touchEnd);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this._boundHandlers.keyDown);
  }

  /**
   * Set editor mode
   * @param {string} mode - Editor mode
   */
  setMode(mode) {
    this.mode = mode;
    
    // Update toolbar
    this.container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update cursor
    this.canvas.style.cursor = {
      select: 'default',
      text: 'text',
      draw: 'crosshair',
      image: 'copy'
    }[mode] || 'default';
    
    this.eventBus.emit('canvas-mode-changed', { mode });
  }

  /**
   * Handle toolbar actions
   * @param {string} action - Action name
   * @private
   */
  _handleAction(action) {
    switch (action) {
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'zoom-in':
        this.zoom(1.2);
        break;
      case 'zoom-out':
        this.zoom(0.8);
        break;
      case 'zoom-reset':
        this.resetZoom();
        break;
      case 'export':
        this.exportToJSON();
        break;
    }
  }

  /**
   * Add text block
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} content - Initial content
   * @returns {string} Element ID
   */
  addTextBlock(x, y, content = '') {
    const id = generateULID();
    const element = {
      id,
      type: 'text',
      x,
      y,
      width: 300,
      height: 100,
      content,
      fontSize: 16,
      fontFamily: 'system-ui, sans-serif',
      color: '#000000'
    };
    
    this.elements.set(id, element);
    this._renderElement(element);
    this._saveToHistory();
    
    return id;
  }

  /**
   * Edit text block
   * @param {string} id - Element ID
   * @param {string} newContent - New content
   */
  editTextBlock(id, newContent) {
    const element = this.elements.get(id);
    if (element && element.type === 'text') {
      element.content = newContent;
      this._renderElement(element);
      this._saveToHistory();
    }
  }

  /**
   * Enable draw mode
   */
  enableDrawMode() {
    this.setMode('draw');
  }

  /**
   * Add drawing
   * @param {Array} strokes - Array of stroke points
   * @returns {string} Element ID
   */
  addDrawing(strokes) {
    const id = generateULID();
    const element = {
      id,
      type: 'drawing',
      strokes,
      color: this.drawColor,
      width: this.drawWidth
    };
    
    this.elements.set(id, element);
    this._renderDrawing(element);
    this._saveToHistory();
    
    return id;
  }

  /**
   * Add image
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {string} imageData - Image data URL or blob URL
   * @returns {string} Element ID
   */
  async addImage(x, y, imageData) {
    const id = generateULID();
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        const element = {
          id,
          type: 'image',
          x,
          y,
          width: img.width,
          height: img.height,
          imageData,
          originalWidth: img.width,
          originalHeight: img.height
        };
        
        this.elements.set(id, element);
        this._renderElement(element);
        this._saveToHistory();
        
        resolve(id);
      };
      
      img.src = imageData;
    });
  }

  /**
   * Add document reference
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {Object} fileRef - File reference
   * @returns {string} Element ID
   */
  addDocument(x, y, fileRef) {
    const id = generateULID();
    const element = {
      id,
      type: 'document',
      x,
      y,
      width: 200,
      height: 60,
      fileRef,
      fileName: fileRef.name || 'Document'
    };
    
    this.elements.set(id, element);
    this._renderElement(element);
    this._saveToHistory();
    
    return id;
  }

  /**
   * Move element
   * @param {string} id - Element ID
   * @param {number} newX - New X position
   * @param {number} newY - New Y position
   */
  moveElement(id, newX, newY) {
    const element = this.elements.get(id);
    if (element && element.type !== 'drawing') {
      element.x = newX;
      element.y = newY;
      this._renderElement(element);
      this._saveToHistory();
    }
  }

  /**
   * Resize element
   * @param {string} id - Element ID
   * @param {number} newWidth - New width
   * @param {number} newHeight - New height
   */
  resizeElement(id, newWidth, newHeight) {
    const element = this.elements.get(id);
    if (element && element.type !== 'drawing') {
      element.width = newWidth;
      element.height = newHeight;
      this._renderElement(element);
      this._saveToHistory();
    }
  }

  /**
   * Delete element
   * @param {string} id - Element ID
   */
  deleteElement(id) {
    const element = this.elements.get(id);
    if (element) {
      this.elements.delete(id);
      
      if (element.type === 'drawing') {
        this._render();
      } else {
        const domElement = this.elementsLayer.querySelector(`[data-element-id="${id}"]`);
        if (domElement) {
          domElement.remove();
        }
      }
      
      this._saveToHistory();
    }
  }

  /**
   * Render element
   * @param {Object} element - Element to render
   * @private
   */
  _renderElement(element) {
    if (element.type === 'drawing') {
      this._renderDrawing(element);
      return;
    }
    
    // Remove existing DOM element if present
    const existing = this.elementsLayer.querySelector(`[data-element-id="${element.id}"]`);
    if (existing) {
      existing.remove();
    }
    
    // Create new DOM element
    let domElement;
    
    switch (element.type) {
      case 'text':
        domElement = this._createTextElement(element);
        break;
      case 'image':
        domElement = this._createImageElement(element);
        break;
      case 'document':
        domElement = this._createDocumentElement(element);
        break;
    }
    
    if (domElement) {
      this.elementsLayer.appendChild(domElement);
    }
  }

  /**
   * Create text element
   * @param {Object} element - Text element
   * @returns {HTMLElement} DOM element
   * @private
   */
  _createTextElement(element) {
    const div = document.createElement('div');
    div.className = 'canvas-text-block';
    div.dataset.elementId = element.id;
    div.contentEditable = true;
    div.textContent = element.content;
    div.style.cssText = `
      position: absolute;
      left: ${element.x}px;
      top: ${element.y}px;
      width: ${element.width}px;
      min-height: ${element.height}px;
      font-size: ${element.fontSize}px;
      font-family: ${element.fontFamily};
      color: ${element.color};
      padding: 8px;
      border: 2px solid transparent;
      border-radius: 4px;
      outline: none;
      background: rgba(255, 255, 255, 0.9);
    `;
    
    // Handle text changes
    div.addEventListener('input', () => {
      element.content = div.textContent;
    });
    
    div.addEventListener('blur', () => {
      this._saveToHistory();
    });
    
    // Handle focus
    div.addEventListener('focus', () => {
      div.style.borderColor = '#3b82f6';
      this.selectedElement = element.id;
    });
    
    div.addEventListener('blur', () => {
      div.style.borderColor = 'transparent';
    });
    
    return div;
  }

  /**
   * Create image element
   * @param {Object} element - Image element
   * @returns {HTMLElement} DOM element
   * @private
   */
  _createImageElement(element) {
    const div = document.createElement('div');
    div.className = 'canvas-image-block';
    div.dataset.elementId = element.id;
    div.style.cssText = `
      position: absolute;
      left: ${element.x}px;
      top: ${element.y}px;
      width: ${element.width}px;
      height: ${element.height}px;
      border: 2px solid transparent;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    const img = document.createElement('img');
    img.src = element.imageData;
    img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `;
    
    div.appendChild(img);
    
    // Make draggable
    this._makeElementDraggable(div, element);
    
    return div;
  }

  /**
   * Create document element
   * @param {Object} element - Document element
   * @returns {HTMLElement} DOM element
   * @private
   */
  _createDocumentElement(element) {
    const div = document.createElement('div');
    div.className = 'canvas-document-block';
    div.dataset.elementId = element.id;
    div.style.cssText = `
      position: absolute;
      left: ${element.x}px;
      top: ${element.y}px;
      width: ${element.width}px;
      height: ${element.height}px;
      padding: 12px;
      background: #f3f4f6;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    `;
    
    div.innerHTML = `
      <span style="font-size: 24px;">📄</span>
      <div style="flex: 1; overflow: hidden;">
        <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${element.fileName}
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          Click to open
        </div>
      </div>
    `;
    
    // Handle click
    div.addEventListener('click', () => {
      this.eventBus.emit('open-file', { fileRef: element.fileRef });
    });
    
    // Make draggable
    this._makeElementDraggable(div, element);
    
    return div;
  }

  /**
   * Make element draggable
   * @param {HTMLElement} domElement - DOM element
   * @param {Object} element - Canvas element
   * @private
   */
  _makeElementDraggable(domElement, element) {
    let isDragging = false;
    let startX, startY, offsetX, offsetY;
    
    domElement.addEventListener('mousedown', (e) => {
      if (this.mode !== 'select') return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      offsetX = element.x;
      offsetY = element.y;
      
      domElement.style.cursor = 'move';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      this.moveElement(element.id, offsetX + dx, offsetY + dy);
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        domElement.style.cursor = 'default';
      }
    });
  }

  /**
   * Render drawing element
   * @param {Object} element - Drawing element
   * @private
   */
  _renderDrawing(element) {
    if (!element.strokes || element.strokes.length === 0) return;
    
    this.ctx.strokeStyle = element.color;
    this.ctx.lineWidth = element.width;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    for (let i = 0; i < element.strokes.length; i++) {
      const point = element.strokes[i];
      if (i === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    }
    this.ctx.stroke();
  }

  /**
   * Handle mouse down
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  _handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale - this.panOffset.x;
    const y = (e.clientY - rect.top) / this.scale - this.panOffset.y;
    
    if (this.mode === 'text') {
      this.addTextBlock(x, y, 'Click to edit...');
      this.setMode('select');
    } else if (this.mode === 'draw') {
      this.isDrawing = true;
      this.currentStroke = [{ x, y }];
    }
  }

  /**
   * Handle mouse move
   * @param {MouseEvent} e - Mouse event
   * @private
   */
  _handleMouseMove(e) {
    if (!this.isDrawing || this.mode !== 'draw') return;
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale - this.panOffset.x;
    const y = (e.clientY - rect.top) / this.scale - this.panOffset.y;
    
    this.currentStroke.push({ x, y });
    
    // Draw current stroke
    this.ctx.strokeStyle = this.drawColor;
    this.ctx.lineWidth = this.drawWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    const lastPoint = this.currentStroke[this.currentStroke.length - 2];
    this.ctx.beginPath();
    this.ctx.moveTo(lastPoint.x, lastPoint.y);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  /**
   * Handle mouse up
   * @private
   */
  _handleMouseUp() {
    if (this.isDrawing && this.currentStroke.length > 0) {
      this.addDrawing(this.currentStroke);
      this.currentStroke = [];
      this.isDrawing = false;
    }
  }

  /**
   * Handle touch start
   * @param {TouchEvent} e - Touch event
   * @private
   */
  _handleTouchStart(e) {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom start
      this.touchStartDist = this._getTouchDistance(e.touches);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.lastTouchPoint = { x: touch.clientX, y: touch.clientY };
      
      // Simulate mouse down
      this._handleMouseDown({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }
  }

  /**
   * Handle touch move
   * @param {TouchEvent} e - Touch event
   * @private
   */
  _handleTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 2) {
      // Pinch zoom
      const currentDist = this._getTouchDistance(e.touches);
      const scale = currentDist / this.touchStartDist;
      this.zoom(scale);
      this.touchStartDist = currentDist;
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      if (this.mode === 'draw') {
        this._handleMouseMove({
          clientX: touch.clientX,
          clientY: touch.clientY
        });
      } else {
        // Pan
        const dx = touch.clientX - this.lastTouchPoint.x;
        const dy = touch.clientY - this.lastTouchPoint.y;
        this.pan(dx, dy);
        this.lastTouchPoint = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  /**
   * Handle touch end
   * @private
   */
  _handleTouchEnd() {
    this._handleMouseUp();
    this.lastTouchPoint = null;
  }

  /**
   * Get distance between two touches
   * @param {TouchList} touches - Touch list
   * @returns {number} Distance
   * @private
   */
  _getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Handle keyboard shortcuts
   * @param {KeyboardEvent} e - Keyboard event
   * @private
   */
  _handleKeyDown(e) {
    // Mode shortcuts
    if (e.key === 'v') this.setMode('select');
    else if (e.key === 't') this.setMode('text');
    else if (e.key === 'd') this.setMode('draw');
    else if (e.key === 'i') this.setMode('image');
    
    // Zoom shortcuts
    else if (e.key === '+' || e.key === '=') this.zoom(1.2);
    else if (e.key === '-') this.zoom(0.8);
    else if (e.key === '0') this.resetZoom();
    
    // Undo/redo
    else if (e.metaKey || e.ctrlKey) {
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
    }
    
    // Delete
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedElement && document.activeElement.tagName !== 'DIV') {
        e.preventDefault();
        this.deleteElement(this.selectedElement);
      }
    }
  }

  /**
   * Zoom canvas
   * @param {number} factor - Zoom factor
   */
  zoom(factor) {
    this.scale = Math.max(0.1, Math.min(5, this.scale * factor));
    this._applyTransform();
  }

  /**
   * Reset zoom
   */
  resetZoom() {
    this.scale = 1;
    this.panOffset = { x: 0, y: 0 };
    this._applyTransform();
  }

  /**
   * Pan canvas
   * @param {number} dx - X offset
   * @param {number} dy - Y offset
   */
  pan(dx, dy) {
    this.panOffset.x += dx / this.scale;
    this.panOffset.y += dy / this.scale;
    this._applyTransform();
  }

  /**
   * Apply transform
   * @private
   */
  _applyTransform() {
    const container = this.container.querySelector('.canvas-container');
    container.style.transform = `scale(${this.scale}) translate(${this.panOffset.x}px, ${this.panOffset.y}px)`;
  }

  /**
   * Render canvas
   * @private
   */
  _render() {
    // Clear canvas
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render all drawings
    for (const [, element] of this.elements) {
      if (element.type === 'drawing') {
        this._renderDrawing(element);
      }
    }
  }

  /**
   * Save current state to history
   * @private
   */
  _saveToHistory() {
    // Remove any history after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Save current state
    const state = {
      elements: Array.from(this.elements.entries())
    };
    
    this.history.push(state);
    this.historyIndex++;
    
    // Limit history to 50 states
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  /**
   * Undo last action
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this._restoreState(this.history[this.historyIndex]);
    }
  }

  /**
   * Redo last undone action
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this._restoreState(this.history[this.historyIndex]);
    }
  }

  /**
   * Restore state from history
   * @param {Object} state - State to restore
   * @private
   */
  _restoreState(state) {
    this.elements = new Map(state.elements);
    this._render();
    
    // Re-render all non-drawing elements
    this.elementsLayer.innerHTML = '';
    for (const [, element] of this.elements) {
      if (element.type !== 'drawing') {
        this._renderElement(element);
      }
    }
  }

  /**
   * Export canvas to JSON
   * @returns {Object} Canvas data
   */
  exportToJSON() {
    const data = {
      version: '1.0',
      width: this.options.width,
      height: this.options.height,
      backgroundColor: this.options.backgroundColor,
      elements: Array.from(this.elements.values())
    };
    
    this.eventBus.emit('canvas-exported', { data });
    
    return data;
  }

  /**
   * Import canvas from JSON
   * @param {Object} data - Canvas data
   */
  importFromJSON(data) {
    if (data.version !== '1.0') {
      console.warn('Unsupported canvas version:', data.version);
      return;
    }
    
    this.elements.clear();
    this.elementsLayer.innerHTML = '';
    
    // Set canvas size
    if (data.width && data.height) {
      this.canvas.width = data.width;
      this.canvas.height = data.height;
    }
    
    // Set background color
    if (data.backgroundColor) {
      this.options.backgroundColor = data.backgroundColor;
    }
    
    // Import elements
    if (data.elements) {
      for (const element of data.elements) {
        this.elements.set(element.id, element);
        this._renderElement(element);
      }
    }
    
    this._render();
    this._saveToHistory();
    
    this.eventBus.emit('canvas-imported', { data });
  }

  /**
   * Clear canvas
   */
  clear() {
    if (confirm('Clear entire canvas? This cannot be undone.')) {
      this.elements.clear();
      this.elementsLayer.innerHTML = '';
      this._render();
      this._saveToHistory();
    }
  }

  /**
   * Destroy canvas editor
   */
  destroy() {
    document.removeEventListener('keydown', this._boundHandlers.keyDown);
    this.canvas.removeEventListener('mousedown', this._boundHandlers.mouseDown);
    this.canvas.removeEventListener('mousemove', this._boundHandlers.mouseMove);
    this.canvas.removeEventListener('mouseup', this._boundHandlers.mouseUp);
    this.canvas.removeEventListener('touchstart', this._boundHandlers.touchStart);
    this.canvas.removeEventListener('touchmove', this._boundHandlers.touchMove);
    this.canvas.removeEventListener('touchend', this._boundHandlers.touchEnd);
  }
}

export default CanvasEditor;
export { CanvasEditor };
