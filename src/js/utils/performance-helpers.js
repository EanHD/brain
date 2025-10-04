/**
 * T021: Performance Optimization Utilities
 * 
 * Additional performance helpers for efficient rendering and data handling
 */

/**
 * Debounce function - delays execution until after wait period
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
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
 * Throttle function - limits execution to once per wait period
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, wait = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}

/**
 * Request Animation Frame wrapper for smooth animations
 * @param {Function} callback - Function to execute
 */
export function raf(callback) {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16); // ~60fps fallback
}

/**
 * Cancel animation frame
 * @param {number} id - RAF id
 */
export function cancelRaf(id) {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    return window.cancelAnimationFrame(id);
  }
  clearTimeout(id);
}

/**
 * Virtual scroll helper - only render visible items
 * @param {Array} items - All items
 * @param {number} containerHeight - Container height in px
 * @param {number} itemHeight - Item height in px
 * @param {number} scrollTop - Current scroll position
 * @param {number} overscan - Extra items to render (default 3)
 * @returns {Object} Visible items and offsets
 */
export function getVisibleItems(items, containerHeight, itemHeight, scrollTop, overscan = 3) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    items: items.slice(startIndex, endIndex + 1),
    startIndex,
    endIndex,
    offsetTop: startIndex * itemHeight,
    totalHeight: items.length * itemHeight
  };
}

/**
 * Batch DOM updates to minimize reflows
 * @param {Function[]} operations - Array of DOM operations
 */
export function batchDOMUpdates(operations) {
  raf(() => {
    operations.forEach(op => op());
  });
}

/**
 * Lazy load images with intersection observer
 * @param {HTMLElement} container - Container element
 * @param {string} selector - Image selector
 */
export function lazyLoadImages(container, selector = 'img[data-src]') {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all images immediately
    container.querySelectorAll(selector).forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        if (img.dataset.src) {
          img.src = img.dataset.src;
          delete img.dataset.src;
          observer.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '50px' // Load 50px before entering viewport
  });

  container.querySelectorAll(selector).forEach(img => {
    observer.observe(img);
  });

  return observer;
}

/**
 * Memoize function results
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Custom key generator
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  
  return function memoized(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
}

/**
 * Deep clone object (performance optimized)
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * Check if two objects are deeply equal
 * @param {*} obj1 - First object
 * @param {*} obj2 - Second object
 * @returns {boolean} True if equal
 */
export function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * Create a web worker for heavy computations
 * @param {Function} fn - Function to run in worker
 * @returns {Object} Worker interface
 */
export function createWorker(fn) {
  const blob = new Blob([`self.onmessage = ${fn.toString()}`], {
    type: 'application/javascript'
  });
  
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  
  return {
    postMessage: (data) => worker.postMessage(data),
    onMessage: (callback) => {
      worker.onmessage = (e) => callback(e.data);
    },
    terminate: () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    }
  };
}

/**
 * Chunk large arrays for processing
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array[]} Chunked arrays
 */
export function chunkArray(array, size = 100) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process array in chunks with delay to prevent blocking
 * @param {Array} array - Array to process
 * @param {Function} processor - Processing function
 * @param {number} chunkSize - Items per chunk
 * @param {number} delay - Delay between chunks in ms
 * @returns {Promise} Completion promise
 */
export function processInChunks(array, processor, chunkSize = 100, delay = 10) {
  const chunks = chunkArray(array, chunkSize);
  let index = 0;

  return new Promise((resolve, reject) => {
    function processNext() {
      if (index >= chunks.length) {
        resolve();
        return;
      }

      try {
        const chunk = chunks[index];
        chunk.forEach(processor);
        index++;
        setTimeout(processNext, delay);
      } catch (error) {
        reject(error);
      }
    }

    processNext();
  });
}

/**
 * Monitor long tasks (>50ms)
 * @param {Function} callback - Callback when long task detected
 */
export function monitorLongTasks(callback) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          callback({
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch (e) {
    console.warn('Long task monitoring not supported');
  }
}

/**
 * Get performance metrics
 * @returns {Object} Performance data
 */
export function getPerformanceMetrics() {
  if (!window.performance) return null;

  const navigation = performance.getEntriesByType('navigation')[0];
  const paint = performance.getEntriesByType('paint');

  return {
    // Navigation timing
    loadTime: navigation?.loadEventEnd - navigation?.fetchStart,
    domReady: navigation?.domContentLoadedEventEnd - navigation?.fetchStart,
    
    // Paint timing
    firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime,
    firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
    
    // Memory (if available)
    memory: performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null
  };
}

export default {
  debounce,
  throttle,
  raf,
  cancelRaf,
  getVisibleItems,
  batchDOMUpdates,
  lazyLoadImages,
  memoize,
  deepClone,
  deepEqual,
  createWorker,
  chunkArray,
  processInChunks,
  monitorLongTasks,
  getPerformanceMetrics
};
