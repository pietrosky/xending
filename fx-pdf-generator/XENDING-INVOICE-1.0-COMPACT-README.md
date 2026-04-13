# Xending Invoice 1.0 Compact - Template Documentation

## 📄 Template Version
**Version:** 1.0 Compact  
**Created:** November 2025  
**Purpose:** Single-page FX Deal Confirmation PDF for Xending Capital  
**Based on:** Xending Invoice 1.0

---

## 🎯 Key Feature
**SINGLE PAGE LAYOUT** - All content fits on one A4 page (~85-90% usage)

---

## 📦 Files Included

1. **Xending-Invoice-1.0-Compact-Styles.css** - Compact CSS styles
2. **Template function:** `generateXendingCompactHTML()` in TemplateService.js
3. **src/utils/Xending.png** - Xending logo

---

## 🎨 Design Optimizations

### Space-Saving Features
- ✅ Reduced margins: 10mm vertical, 12mm horizontal
- ✅ Smaller font base: 9.5px (vs 10px in normal version)
- ✅ Compact line height: 1.4 (vs 1.5)
- ✅ Smaller logo: 40px (vs 50px)
- ✅ Reduced padding throughout: 10-12px (vs 15-20px)
- ✅ Tighter spacing between sections: 12-14px
- ✅ Two-column layout for payment sections

### Visual Elements
- Logo: 40px circular Xending logo
- QR Code: 55px placeholder
- Banners: 10-12px padding, 12px font
- Tables: Compact padding (12px)
- Font sizes: 7.5px - 12px range

---

## 📋 Layout Structure

```
┌─────────────────────────────────────────┐
│ Logo (40px) | Header Text | QR (55px)   │ Compact header
├─────────────────────────────────────────┤
│ Deal No. | Contact Info                 │ Single line
├─────────────────────────────────────────┤
│ DEAL CONFIRMATION (Banner 12px)         │
├──────────────────┬──────────────────────┤
│ Cliente Info     │ Deal Info            │ 2 columns
│ (compact)        │ (compact)            │
├──────────────────┴──────────────────────┤
│ TRANSACTION DETAILS (Banner 12px)       │
│ Buy | Rate | Pay (Compact table)        │
├──────────────────┬──────────────────────┤
│ Cliente Paga A:  │ Xending Paga A:      │ 2 columns
│ (35% width)      │ (65% width)          │
│ Payment details  │ Bank account info    │
├──────────────────┴──────────────────────┤
│ BENEFICIARY (if provided)               │
│ Same 2-column layout                    │
└─────────────────────────────────────────┘
```

---

## 📐 Size Specifications

### Container
- Width: 210mm (A4)
- Padding: 10mm (top/bottom), 12mm (left/right)

### Typography
- Base font: 9.5px Arial
- Headers: 11-12px
- Labels: 8.5-9.5px
- Bank info: 7.5-8px
- Line height: 1.4

### Spacing
- Section margins: 12-14px
- Element padding: 10-12px
- Field spacing: 5-6px
- Banner padding: 10-12px

### Colors (Same as normal version)
- Primary Turquoise: `#00d4aa`
- Secondary Orange: `#ff6b35`
- Dark Gray: `#34495e`
- Text: `#333333`
- Background: `#f9f9f9`

---

## 🚀 Usage

### Select in Form
```typescript
templateVersion: 'xending-compact'
```

### Generate PDF
```javascript
const response = await axios.post(
  'http://localhost:3002/generate-pdf/xending-compact',
  dealData
);
```

---

## 📊 Comparison with Normal Version

| Feature | Normal (1.0) | Compact (1.0) |
|---------|-------------|---------------|
| Pages | 2 pages | 1 page |
| Base font | 10px | 9.5px |
| Margins | 12mm | 10mm (v), 12mm (h) |
| Logo size | 50px | 40px |
| Section padding | 15-20px | 10-12px |
| Spacing | 15-20px | 12-14px |
| Layout | Stacked | 2-column optimized |
| Page usage | ~60% | ~85-90% |

---

## ⚠️ Important Notes

- **Single page guarantee:** All content fits on one A4 page
- **Beneficiary section:** Only shows if `beneficiaryAccountNumber` is provided
- **Automatic logo:** Loads from `src/utils/Xending.png`
- **Responsive:** Adjusts to content but stays within page bounds
- **Print-optimized:** Designed for professional printing

---

## 🔄 Version History

### Version 1.0 Compact (November 2025)
- Initial compact version release
- Single-page layout optimization
- Based on Xending Invoice 1.0
- Reduced font sizes and spacing
- Two-column payment sections
- Optimized for 85-90% page usage

---

## 📝 Data Fields

Same fields as Xending Invoice 1.0 (see XENDING-INVOICE-1.0-README.md)

All fields from the normal version are supported in the compact version.

---

## 💡 Use Cases

**Best for:**
- Quick reference documents
- Email attachments (smaller file)
- Single-page printing requirements
- Simple deals without extensive notes
- Standard spot/forward transactions

**Consider normal version for:**
- Deals with extensive remarks
- Multiple beneficiaries
- Additional documentation needs
- More formal presentations

---

## 📧 Support

For questions or modifications, contact the development team.

**Template maintained by:** Xending Capital Development Team
