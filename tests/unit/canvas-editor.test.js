/**
 * Canvas Editor Contract Tests
 * These tests define the contract for infinite canvas note-taking
 * Following TDD: tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Contract: CanvasEditor
 * Handles infinite canvas with freeform element positioning
 */
describe('CanvasEditor Contract Tests', () => {
  
  describe('Canvas Initialization', () => {
    it('should create new canvas instance', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      expect(canvas).toBeDefined();
      expect(canvas).toHaveProperty('container', container);
    });
    
    it('should set default canvas dimensions', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      expect(canvas).toHaveProperty('width');
      expect(canvas).toHaveProperty('height');
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });
    
    it('should support custom canvas dimensions', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container, { 
        width: 5000, 
        height: 5000 
      });
      
      expect(canvas.width).toBe(5000);
      expect(canvas.height).toBe(5000);
    });
    
    it('should initialize viewport at origin', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      expect(canvas).toHaveProperty('viewport');
      expect(canvas.viewport.x).toBe(0);
      expect(canvas.viewport.y).toBe(0);
      expect(canvas.viewport.zoom).toBe(1);
    });
  });
  
  describe('Element Creation', () => {
    it('should create text element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Hello World',
        x: 100,
        y: 100
      });
      
      expect(typeof elementId).toBe('string');
      expect(elementId.length).toBe(26); // ULID
    });
    
    it('should create image element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'image',
        src: 'data:image/png;base64,mock',
        x: 200,
        y: 200,
        width: 300,
        height: 200
      });
      
      expect(elementId).toBeDefined();
    });
    
    it('should create drawing element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'drawing',
        paths: [[{x: 0, y: 0}, {x: 10, y: 10}]],
        strokeColor: '#000000',
        strokeWidth: 2
      });
      
      expect(elementId).toBeDefined();
    });
    
    it('should create note card element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'note',
        noteId: 'test-note-123',
        x: 300,
        y: 300,
        width: 250,
        height: 150
      });
      
      expect(elementId).toBeDefined();
    });
    
    it('should create connector/arrow element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'connector',
        from: { x: 100, y: 100 },
        to: { x: 200, y: 200 },
        style: 'arrow'
      });
      
      expect(elementId).toBeDefined();
    });
  });
  
  describe('Element Manipulation', () => {
    it('should move element to new position', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Move me',
        x: 100,
        y: 100
      });
      
      await canvas.moveElement(elementId, { x: 300, y: 300 });
      
      const element = canvas.getElement(elementId);
      expect(element.x).toBe(300);
      expect(element.y).toBe(300);
    });
    
    it('should resize element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'note',
        noteId: 'test',
        x: 100,
        y: 100,
        width: 200,
        height: 150
      });
      
      await canvas.resizeElement(elementId, { width: 300, height: 250 });
      
      const element = canvas.getElement(elementId);
      expect(element.width).toBe(300);
      expect(element.height).toBe(250);
    });
    
    it('should rotate element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Rotate me',
        x: 100,
        y: 100
      });
      
      await canvas.rotateElement(elementId, 45);
      
      const element = canvas.getElement(elementId);
      expect(element.rotation).toBe(45);
    });
    
    it('should delete element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Delete me',
        x: 100,
        y: 100
      });
      
      await canvas.deleteElement(elementId);
      
      const element = canvas.getElement(elementId);
      expect(element).toBeNull();
    });
    
    it('should update element content', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Original',
        x: 100,
        y: 100
      });
      
      await canvas.updateElement(elementId, { content: 'Updated' });
      
      const element = canvas.getElement(elementId);
      expect(element.content).toBe('Updated');
    });
  });
  
  describe('Selection & Multi-Select', () => {
    it('should select single element', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Select me',
        x: 100,
        y: 100
      });
      
      canvas.selectElement(elementId);
      
      expect(canvas.getSelectedElements()).toContain(elementId);
    });
    
    it('should support multi-select', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const id1 = await canvas.addElement({ type: 'text', content: 'First', x: 100, y: 100 });
      const id2 = await canvas.addElement({ type: 'text', content: 'Second', x: 200, y: 200 });
      
      canvas.selectElement(id1);
      canvas.selectElement(id2, { addToSelection: true });
      
      const selected = canvas.getSelectedElements();
      expect(selected).toContain(id1);
      expect(selected).toContain(id2);
      expect(selected.length).toBe(2);
    });
    
    it('should move multiple selected elements together', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const id1 = await canvas.addElement({ type: 'text', content: 'A', x: 100, y: 100 });
      const id2 = await canvas.addElement({ type: 'text', content: 'B', x: 200, y: 200 });
      
      canvas.selectElement(id1);
      canvas.selectElement(id2, { addToSelection: true });
      
      await canvas.moveSelected({ dx: 50, dy: 50 });
      
      const element1 = canvas.getElement(id1);
      const element2 = canvas.getElement(id2);
      
      expect(element1.x).toBe(150);
      expect(element2.x).toBe(250);
    });
    
    it('should select elements within rectangular area', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      await canvas.addElement({ type: 'text', content: 'Inside', x: 150, y: 150 });
      await canvas.addElement({ type: 'text', content: 'Outside', x: 500, y: 500 });
      
      canvas.selectInRect({ x: 100, y: 100, width: 200, height: 200 });
      
      const selected = canvas.getSelectedElements();
      expect(selected.length).toBe(1);
    });
  });
  
  describe('Viewport & Navigation', () => {
    it('should pan viewport', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      canvas.panViewport({ dx: 100, dy: 50 });
      
      expect(canvas.viewport.x).toBe(100);
      expect(canvas.viewport.y).toBe(50);
    });
    
    it('should zoom viewport', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      canvas.setZoom(1.5);
      
      expect(canvas.viewport.zoom).toBe(1.5);
    });
    
    it('should constrain zoom to min/max bounds', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      canvas.setZoom(10); // Too high
      expect(canvas.viewport.zoom).toBeLessThanOrEqual(5);
      
      canvas.setZoom(0.01); // Too low
      expect(canvas.viewport.zoom).toBeGreaterThanOrEqual(0.1);
    });
    
    it('should center viewport on specific point', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      canvas.centerOn({ x: 500, y: 500 });
      
      expect(canvas.viewport.x).toBeDefined();
      expect(canvas.viewport.y).toBeDefined();
    });
    
    it('should fit all elements in viewport', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      await canvas.addElement({ type: 'text', content: 'A', x: 100, y: 100 });
      await canvas.addElement({ type: 'text', content: 'B', x: 1000, y: 1000 });
      
      canvas.fitToView();
      
      expect(canvas.viewport.zoom).toBeLessThan(1);
    });
  });
  
  describe('Layers & Z-Index', () => {
    it('should bring element to front', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const id1 = await canvas.addElement({ type: 'text', content: 'Back', x: 100, y: 100 });
      const id2 = await canvas.addElement({ type: 'text', content: 'Front', x: 100, y: 100 });
      
      canvas.bringToFront(id1);
      
      const element1 = canvas.getElement(id1);
      const element2 = canvas.getElement(id2);
      
      expect(element1.zIndex).toBeGreaterThan(element2.zIndex);
    });
    
    it('should send element to back', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const id1 = await canvas.addElement({ type: 'text', content: 'Top', x: 100, y: 100 });
      const id2 = await canvas.addElement({ type: 'text', content: 'Bottom', x: 100, y: 100 });
      
      canvas.sendToBack(id2);
      
      const element2 = canvas.getElement(id2);
      expect(element2.zIndex).toBe(0);
    });
  });
  
  describe('Undo/Redo', () => {
    it('should undo element creation', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Undo me',
        x: 100,
        y: 100
      });
      
      canvas.undo();
      
      const element = canvas.getElement(elementId);
      expect(element).toBeNull();
    });
    
    it('should undo element move', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Move me',
        x: 100,
        y: 100
      });
      
      await canvas.moveElement(elementId, { x: 300, y: 300 });
      canvas.undo();
      
      const element = canvas.getElement(elementId);
      expect(element.x).toBe(100);
      expect(element.y).toBe(100);
    });
    
    it('should redo undone action', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({
        type: 'text',
        content: 'Redo me',
        x: 100,
        y: 100
      });
      
      canvas.undo();
      canvas.redo();
      
      const element = canvas.getElement(elementId);
      expect(element).not.toBeNull();
    });
    
    it('should limit undo history size', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container, { maxHistorySize: 50 });
      
      // Create 100 elements
      for (let i = 0; i < 100; i++) {
        await canvas.addElement({ type: 'text', content: `Element ${i}`, x: i * 10, y: 100 });
      }
      
      // Should only be able to undo 50 times
      let undoCount = 0;
      while (canvas.canUndo()) {
        canvas.undo();
        undoCount++;
      }
      
      expect(undoCount).toBeLessThanOrEqual(50);
    });
  });
  
  describe('Persistence & Serialization', () => {
    it('should serialize canvas state to JSON', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      await canvas.addElement({ type: 'text', content: 'Test', x: 100, y: 100 });
      
      const state = canvas.serialize();
      
      expect(typeof state).toBe('string');
      const parsed = JSON.parse(state);
      expect(parsed).toHaveProperty('elements');
      expect(parsed).toHaveProperty('viewport');
    });
    
    it('should deserialize canvas state from JSON', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas1 = new CanvasEditor(container);
      
      await canvas1.addElement({ type: 'text', content: 'Test', x: 100, y: 100 });
      const state = canvas1.serialize();
      
      const canvas2 = new CanvasEditor(container);
      canvas2.deserialize(state);
      
      expect(canvas2.getAllElements().length).toBe(1);
    });
    
    it('should save canvas to database', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      await canvas.addElement({ type: 'text', content: 'Save me', x: 100, y: 100 });
      
      const canvasId = await canvas.save({ title: 'Test Canvas' });
      
      expect(typeof canvasId).toBe('string');
      expect(canvasId.length).toBe(26); // ULID
    });
    
    it('should load canvas from database', async () => {
      const { CanvasEditor, loadCanvas } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas1 = new CanvasEditor(container);
      
      await canvas1.addElement({ type: 'text', content: 'Load me', x: 100, y: 100 });
      const canvasId = await canvas1.save({ title: 'Test Canvas' });
      
      const canvas2 = await loadCanvas(canvasId, container);
      
      expect(canvas2.getAllElements().length).toBe(1);
    });
  });
  
  describe('Performance', () => {
    it('should render 100 elements smoothly (<16ms)', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      // Add 100 elements
      for (let i = 0; i < 100; i++) {
        await canvas.addElement({
          type: 'text',
          content: `Element ${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000
        });
      }
      
      const startTime = performance.now();
      canvas.render();
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(16); // 60fps
    });
    
    it('should only render visible elements', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      // Add elements outside viewport
      await canvas.addElement({ type: 'text', content: 'Far away', x: 10000, y: 10000 });
      
      const visibleElements = canvas.getVisibleElements();
      expect(visibleElements.length).toBe(0);
    });
  });
  
  describe('Keyboard Shortcuts', () => {
    it('should delete selected elements on Delete key', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({ type: 'text', content: 'Delete me', x: 100, y: 100 });
      canvas.selectElement(elementId);
      
      canvas.handleKeyPress({ key: 'Delete' });
      
      const element = canvas.getElement(elementId);
      expect(element).toBeNull();
    });
    
    it('should undo on Ctrl+Z', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      const elementId = await canvas.addElement({ type: 'text', content: 'Undo me', x: 100, y: 100 });
      
      canvas.handleKeyPress({ key: 'z', ctrlKey: true });
      
      const element = canvas.getElement(elementId);
      expect(element).toBeNull();
    });
    
    it('should select all on Ctrl+A', async () => {
      const { CanvasEditor } = await import('../../src/js/components/canvas-editor.js');
      
      const container = document.createElement('div');
      const canvas = new CanvasEditor(container);
      
      await canvas.addElement({ type: 'text', content: 'A', x: 100, y: 100 });
      await canvas.addElement({ type: 'text', content: 'B', x: 200, y: 200 });
      
      canvas.handleKeyPress({ key: 'a', ctrlKey: true });
      
      const selected = canvas.getSelectedElements();
      expect(selected.length).toBe(2);
    });
  });
});
