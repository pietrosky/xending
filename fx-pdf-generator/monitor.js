const os = require('os');

class PerformanceMonitor {
  static logMemoryUsage() {
    const used = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();
    
    console.log('📊 Memory Usage:');
    console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  System Free: ${Math.round(free / 1024 / 1024 * 100) / 100} MB`);
    console.log(`  System Total: ${Math.round(total / 1024 / 1024 * 100) / 100} MB`);
  }

  static startMonitoring(intervalMs = 30000) {
    console.log('🔍 Starting performance monitoring...');
    
    setInterval(() => {
      this.logMemoryUsage();
    }, intervalMs);
  }
}

module.exports = PerformanceMonitor;