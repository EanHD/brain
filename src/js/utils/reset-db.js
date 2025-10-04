/**
 * Database Reset Utility
 * 
 * Use this to clear the IndexedDB database when schema changes
 * are incompatible with existing data.
 * 
 * Run this in the browser console:
 * await resetDatabase();
 */

/**
 * Delete the Brain database and reload the page
 */
async function resetDatabase() {
  console.log('🗑️ Deleting Brain database...');
  
  try {
    // Close any open connections
    if (window.db) {
      await window.db.close();
    }
    
    // Delete the database
    await indexedDB.deleteDatabase('brain-notebook');
    
    console.log('✅ Database deleted successfully!');
    console.log('🔄 Reloading page...');
    
    // Reload the page to reinitialize with fresh database
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Failed to delete database:', error);
    console.log('💡 Try closing all tabs with this app open and try again.');
  }
}

// Export for use in console
window.resetDatabase = resetDatabase;

console.log('💡 Database reset utility loaded!');
console.log('💡 To clear the database, run: resetDatabase()');
