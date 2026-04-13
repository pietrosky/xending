const PDFGenerator = require('./src/services/PDFGenerator');
const fs = require('fs');

async function testMonexFormat() {
  console.log('Testing Monex format with exact data...');
  
  const exactDealData = {
    dealNumber: 'TMP-USA-DEAL-0424313',
    clientName: 'EDGAR EL PANA DEL RITMO SA DE CV',
    clientAddress: 'EL ZAR 3344<br>SAN NICOLAS DE LOS<br>GARZA,NUEVO LEON,Mexico',
    bookedBy: 'XendingGlobalAPI_fvo_LVgbNNxB0O5',
    accountNumber: '0016474',
    remarks: '',
    tradeDate: '28-Sep-2025',
    dealType: 'Spot',
    relManager: 'Xending Capital',
    fxDealer: 'Adam Kane',
    processor: 'Xending Capital',
    buyCurrency: 'USD',
    buyAmount: '4,999.00',
    exchangeRate: '1.1587',
    payCurrency: 'EUR',
    payAmount: '4,314.32',
    feeText: 'USD 20.00 (Fees)',
    totalDue: '4,314.32',
    transferDate: '28-Sep-2025',
    accountNumber1: 'DE37 5031 0400 0437 7961 00',
    accountName1: 'Monex USA',
    accountAddress1: '1201 New York Avenue, NW, Suite 300 Washington, DC<br>20005 USA',
    swift1: 'BARCDEFF',
    bankName1: 'Barclays Bank PLC',
    bankAddress1: 'Frankfurt, Germany',
    byOrderOf1: 'EDGAR EL PANA DEL RITMO SA DE CV'
  };

  try {
    console.log('Generating exact Monex format PDF...');
    const pdf = await PDFGenerator.generateDealConfirmation('monex', exactDealData);
    fs.writeFileSync('monex-format-test.pdf', pdf);
    console.log('✅ Exact Monex format PDF generated: monex-format-test.pdf');
    console.log('📋 Compare this PDF with your original format!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMonexFormat();