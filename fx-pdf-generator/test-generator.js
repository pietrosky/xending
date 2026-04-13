const PDFGenerator = require('./src/services/PDFGenerator');
const fs = require('fs');

async function testGenerator() {
  console.log('Testing PDF Generator...');
  
  const testDealData = {
    dealId: 'MX-2024-001',
    date: '2024-01-15',
    amount: '50,000.00',
    currency: 'USD',
    rate: '17.25',
    clientName: 'Test Client',
    clientEmail: 'test@example.com'
  };

  try {
    // Test Monex template
    console.log('Generating Monex PDF...');
    const monexPdf = await PDFGenerator.generateDealConfirmation('monex', testDealData);
    fs.writeFileSync('test-monex.pdf', monexPdf);
    console.log('✅ Monex PDF generated: test-monex.pdf');

    // Test Generic template
    console.log('Generating Generic PDF...');
    const genericPdf = await PDFGenerator.generateDealConfirmation('generic', testDealData);
    fs.writeFileSync('test-generic.pdf', genericPdf);
    console.log('✅ Generic PDF generated: test-generic.pdf');

    console.log('🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGenerator();