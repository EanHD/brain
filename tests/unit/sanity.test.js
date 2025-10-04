/**
 * Quick sanity test to verify modules can be imported
 */

import { describe, it, expect } from 'vitest';

describe('Module Import Tests', () => {
  it('should import ulid module', async () => {
    const ulidModule = await import('../../src/js/ulid.js');
    expect(ulidModule).toBeDefined();
    expect(ulidModule.generateULID).toBeDefined();
  });

  it('should import events-utility module', async () => {
    const eventsModule = await import('../../src/js/events-utility.js');
    expect(eventsModule).toBeDefined();
    expect(eventsModule.getEventBus).toBeDefined();
  });

  it('should import performance-utility module', async () => {
    const perfModule = await import('../../src/js/performance-utility.js');
    expect(perfModule).toBeDefined();
    expect(perfModule.PerformanceMonitor).toBeDefined();
  });

  it('should import state module', async () => {
    const stateModule = await import('../../src/js/state.js');
    expect(stateModule).toBeDefined();
    expect(stateModule.state).toBeDefined();
  });

  it('should import db module', async () => {
    const dbModule = await import('../../src/js/db.js');
    expect(dbModule).toBeDefined();
    expect(dbModule.default).toBeDefined();
  });

  it('should import ai module', async () => {
    const aiModule = await import('../../src/js/ai.js');
    expect(aiModule).toBeDefined();
    expect(aiModule.default).toBeDefined();
  });
});

describe('ULID Functionality Tests', () => {
  it('should generate valid ULIDs', async () => {
    const { generateULID, isValidULID } = await import('../../src/js/ulid.js');
    
    const ulid = generateULID();
    expect(ulid).toBeDefined();
    expect(typeof ulid).toBe('string');
    expect(ulid).toHaveLength(26);
    expect(isValidULID(ulid)).toBe(true);
  });

  it('should generate unique ULIDs', async () => {
    const { generateULID } = await import('../../src/js/ulid.js');
    
    const ulid1 = generateULID();
    const ulid2 = generateULID();
    expect(ulid1).not.toBe(ulid2);
  });
});

describe('Event System Functionality Tests', () => {
  it('should create event bus', async () => {
    const { getEventBus } = await import('../../src/js/events-utility.js');
    
    const eventBus = getEventBus();
    expect(eventBus).toBeDefined();
    expect(eventBus.on).toBeDefined();
    expect(eventBus.emit).toBeDefined();
    expect(eventBus.off).toBeDefined();
  });

  it('should emit and receive events', async () => {
    const { getEventBus } = await import('../../src/js/events-utility.js');
    
    const eventBus = getEventBus();
    let received = false;
    
    eventBus.on('test-event', () => {
      received = true;
    });
    
    eventBus.emit('test-event');
    expect(received).toBe(true);
  });
});

describe('Performance Monitor Functionality Tests', () => {
  it('should get performance monitor instance', async () => {
    const { PerformanceMonitor } = await import('../../src/js/performance-utility.js');
    
    const monitor = PerformanceMonitor.getInstance();
    expect(monitor).toBeDefined();
    expect(monitor.generateReport).toBeDefined();
  });

  it('should measure operations', async () => {
    const { measureOperation } = await import('../../src/js/performance-utility.js');
    
    const result = await measureOperation('test-op', async () => {
      return 'test-result';
    });
    
    expect(result).toBe('test-result');
  });
});
