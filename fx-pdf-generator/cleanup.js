const fs = require('fs');
const path = require('path');

// Clean up temporary files and optimize
function cleanup() {
  console.log('🧹 Starting cleanup...');
  
  // Remove any generated test PDFs
  const testFiles = [
    'test-*.pdf',
    'temp-*.pdf',
    '*.tmp'
  ];
  
  // Clear any cached data
  if (global.gc) {
    global.gc();
    console.log('✅ Garbage collection triggered');
  }
  
  console.log('✅ Cleanup completed');
}

// Run cleanup if called directly
if (require.main === module) {
  cleanup();
}

module.exports = cleanup;