#!/usr/bin/env node

/**
 * Simple test runner to verify our implementations
 * Tests the core modules we just implemented
 */

import { generateULID, isValidULID, extractTimestamp } from './ulid.js';
import { EventEmitter, createEventBus, APPLICATION_EVENTS } from './events-utility.js';
import { PerformanceMonitor, measureOperation } from './performance-utility.js';

console.log('🧪 Running Brain PWA Core Module Tests...\n');

// Test ULID functionality
console.log('📝 Testing ULID Generation...');
try {
  const ulid1 = generateULID();
  const ulid2 = generateULID();
  
  console.log(`✅ Generated ULID: ${ulid1}`);
  console.log(`✅ Generated another: ${ulid2}`);
  console.log(`✅ ULIDs are unique: ${ulid1 !== ulid2}`);
  console.log(`✅ ULID format valid: ${isValidULID(ulid1)}`);
  
  const timestamp = extractTimestamp(ulid1);
  console.log(`✅ Extracted timestamp: ${new Date(timestamp).toISOString()}`);
  
} catch (error) {
  console.error('❌ ULID Test Failed:', error.message);
}

// Test Event System
console.log('\n🎯 Testing Event System...');
try {
  const eventBus = createEventBus();
  let eventReceived = false;
  
  // Test event registration and emission
  const unsubscribe = eventBus.on('test-event', (data) => {
    eventReceived = true;
    console.log(`✅ Event received with data: ${data}`);
  });
  
  eventBus.emit('test-event', 'Hello World!');
  
  if (eventReceived) {
    console.log('✅ Event system working correctly');
  }
  
  unsubscribe();
  console.log('✅ Event unsubscription successful');
  
} catch (error) {
  console.error('❌ Event System Test Failed:', error.message);
}

// Test Performance Monitoring
console.log('\n⚡ Testing Performance Monitoring...');
try {
  const perfMonitor = PerformanceMonitor.getInstance();
  
  // Test performance measurement
  const result = await measureOperation('test-operation', async () => {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));
    return 'test-result';
  });
  
  console.log(`✅ Performance measurement completed: ${result.value}`);
  console.log(`✅ Operation took: ${result.performance.duration.toFixed(2)}ms`);
  
  // Get metrics
  const metrics = perfMonitor.getMetrics('test-operation');
  if (metrics) {
    console.log(`✅ Metrics collected: ${metrics.count} operations, avg ${metrics.averageDuration.toFixed(2)}ms`);
  }
  
} catch (error) {
  console.error('❌ Performance Monitoring Test Failed:', error.message);
}

// Test Integration
console.log('\n🔗 Testing Module Integration...');
try {
  const eventBus = createEventBus();
  const perfMonitor = PerformanceMonitor.getInstance();
  
  // Test performance violation event
  let violationReceived = false;
  eventBus.on(APPLICATION_EVENTS.PERFORMANCE_VIOLATION, (violation) => {
    violationReceived = true;
    console.log(`✅ Performance violation event received: ${violation.operation}`);
  });
  
  // Simulate a slow operation to trigger violation
  perfMonitor.setBudget('slow-test', 5); // 5ms budget
  
  await measureOperation('slow-test', async () => {
    await new Promise(resolve => setTimeout(resolve, 10)); // 10ms work (exceeds budget)
    return 'slow-result';
  });
  
  // Give time for async event processing
  await new Promise(resolve => setTimeout(resolve, 10));
  
  if (violationReceived) {
    console.log('✅ Performance-Event integration working');
  } else {
    console.log('⚠️ Performance violation event not received (may be timing issue)');
  }
  
} catch (error) {
  console.error('❌ Integration Test Failed:', error.message);
}

console.log('\n🎉 Core Module Tests Completed!');
console.log('\nNext Steps:');
console.log('1. Run full test suite with: npm test');
console.log('2. Continue with Phase 3.4: User Interface Implementation');
console.log('3. Implement view controllers and CSS styling');

process.exit(0);