# Install Report Generation Packages

## Required Packages

Run these commands to install the packages needed for report generation:

```bash
npm install xlsx jspdf
```

### Package Details:

1. **xlsx** - Excel file generation
   - Creates .xlsx files with multiple sheets
   - Supports complex data structures
   - Industry standard for Excel exports

2. **jsPDF** - PDF file generation
   - Creates professional PDF reports
   - Client-side PDF generation
   - No server dependencies needed

## After Installation

Once installed, the "Generate Report" button in the Treasurer Panel will work properly and allow:
- ✅ Excel export (.xlsx)
- ✅ PDF export (.pdf)
- ✅ Three report types: Summary, Detailed, Analytics

## Usage

1. Click "Generate Report" button in Treasurer Panel
2. Select report type (Summary/Detailed/Analytics)
3. Choose date range
4. Click "Export to Excel" or "Export to PDF"
5. File downloads automatically

## Features

### Summary Report
- Overview statistics
- Payment counts by status
- Method distribution
- Monthly trends
- Top collectors

### Detailed Report
- All transactions listed
- Complete student info
- Reference codes
- Batch breakdowns

### Analytics Report (SPSS-style)
- Statistical analysis
- Frequency distributions
- Correlation data
- Performance metrics
- Predictive insights
