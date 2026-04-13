# Xending Invoice 1.0 - Template Documentation

## 📄 Template Version
**Version:** 1.0  
**Created:** November 2025  
**Purpose:** Professional FX Deal Confirmation PDF Generator for Xending Capital

---

## 📦 Files Included

1. **Xending-Invoice-1.0-Template.js** - Template HTML generator
2. **Xending-Invoice-1.0-Styles.css** - CSS styles
3. **src/utils/Xending.png** - Xending logo

---

## 🎨 Features

### Design Elements
- ✅ Xending Capital circular logo (turquesa/naranja)
- ✅ Modern gradient design
- ✅ Professional layout with clear sections
- ✅ Responsive and print-optimized

### Sections Included
1. **Header** - Logo, company info, QR placeholder
2. **Deal Information** - Deal number, contact info
3. **Client & Deal Details** - Client info, trade details
4. **Transaction Details** - Buy/Sell amounts, exchange rate, fees
5. **Payment Instructions** - Xending bank account (where client pays)
6. **Beneficiary Details** - Final beneficiary account (where Xending pays)

---

## 📋 Required Data Fields

### Client Information
- `clientName` - Company name
- `clientAddress` - Full address
- `clientContact` - Contact person (optional)
- `clientEmail` - Email (optional)
- `clientPhone` - Phone (optional)

### Deal Information
- `dealNumber` - Deal ID (e.g., "XG-25-0001")
- `dealType` - Type: "Spot", "Forward", etc.
- `tradeDate` - Transaction date

### Transaction Details
- `buyCurrency` - Currency client buys (USD, EUR, etc.)
- `buyAmount` - Amount to buy (formatted: "100,000.00")
- `exchangeRate` - Exchange rate (formatted: "17.8500")
- `payCurrency` - Currency client pays (MXN, USD, etc.)
- `payAmount` - Amount to pay (formatted: "1,785,000.00")
- `feeText` - Fee description (e.g., "MXN 2,500.00 (Xending Fee)")
- `totalDue` - Total amount due (formatted: "1,787,500.00")

### Team Information
- `bookedBy` - Who booked the deal
- `relManager` - Relationship Manager (default: "Xending Capital Team")
- `fxDealer` - FX Dealer (default: "Xending FX Desk")
- `processor` - Processor (default: "Xending Capital Platform")
- `remarks` - Additional notes (optional)

### Payment Instructions (Xending Account)
- `accountNumber1` - Xending account number
- `accountName1` - Xending account name
- `accountAddress1` - Xending account address
- `swift1` - SWIFT code
- `bankName1` - Bank name
- `bankAddress1` - Bank address
- `byOrderOf1` - By order of (usually client name)

### Beneficiary Details (Optional)
- `beneficiaryAccountNumber` - Beneficiary account number
- `beneficiaryAccountName` - Beneficiary name
- `beneficiaryAccountAddress` - Beneficiary address
- `beneficiarySwift` - SWIFT code
- `beneficiaryBankName` - Bank name
- `beneficiaryBankAddress` - Bank address

---

## 🎨 Color Scheme

- **Primary Turquoise:** `#00d4aa`
- **Secondary Orange:** `#ff6b35`
- **Dark Gray:** `#34495e`
- **Text:** `#333333`
- **Background:** `#f9f9f9`

---

## 🚀 Usage

### In TemplateService.js
```javascript
const dealData = {
  clientName: "IMPORTADORA MEXICANA SA DE CV",
  dealNumber: "XG-25-0001",
  buyCurrency: "USD",
  buyAmount: "100,000.00",
  exchangeRate: "17.8500",
  payCurrency: "MXN",
  payAmount: "1,785,000.00",
  totalDue: "1,787,500.00",
  // ... more fields
};

const html = TemplateService.generateXendingHTML(dealData);
```

### Generate PDF
```javascript
const pdf = await PDFGenerator.generateDealConfirmation('xending', dealData);
```

---

## 📝 Notes

- Logo loads automatically from `src/utils/Xending.png`
- Beneficiary section only shows if `beneficiaryAccountNumber` is provided
- All amounts should be pre-formatted with commas
- Dates should be formatted as "DD-MMM-YYYY" or "DD/MM/YYYY"

---

## 🔄 Version History

### Version 1.0 (November 2025)
- Initial release
- Complete FX deal confirmation template
- Dual payment sections (client pays, Xending pays)
- Professional Xending branding
- Responsive design

---

## 📧 Support

For questions or modifications, contact the development team.

**Template maintained by:** Xending Capital Development Team
