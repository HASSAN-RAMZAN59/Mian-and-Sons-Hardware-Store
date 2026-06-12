import React, { useRef } from 'react';
import { toast } from 'react-toastify';
import { FaPrint, FaDownload, FaWhatsapp, FaTimes } from 'react-icons/fa';
import Button from '../../components/common/Button';

const Invoice = ({ invoiceData, onClose, isModal = false }) => {
  const invoiceRef = useRef();

  // Default invoice data for testing
  const defaultInvoiceData = {
    invoiceNo: 'INV-2026-001',
    date: '2026-03-11',
    time: '14:30:25',
    customerName: 'Ahmed Construction Co.',
    customerAddress: 'Plot 45, Main Boulevard, DHA Phase 5, Lahore',
    customerPhone: '+92-300-1234567',
    items: [
      {
        srNo: 1,
        productName: 'Cement',
        brandModel: 'Lucky Star - 50kg',
        quantity: 50,
        unit: 'Bag',
        unitPrice: 1200,
        discount: 0,
        amount: 60000
      },
      {
        srNo: 2,
        productName: 'Steel Bars',
        brandModel: 'Amreli - 10mm',
        quantity: 100,
        unit: 'Pc',
        unitPrice: 650,
        discount: 0,
        amount: 65000
      }
    ],
    subtotal: 125000,
    discount: 6250,
    discountPercentage: 5,
    tax: 0,
    grandTotal: 118750,
    paymentMethod: 'Bank Transfer',
    amountPaid: 118750,
    balanceDue: 0,
    cashierName: 'Ali Hassan',
    branch: 'Main Branch'
  };

  const invoice = invoiceData || defaultInvoiceData;

  // Print invoice
  const handlePrint = () => {
    window.print();
    toast.success('Invoice sent to printer');
  };

  // Download as PDF
  const handleDownloadPDF = async () => {
    try {
      // Dynamic import to reduce bundle size
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoice.invoiceNo}.pdf`);
      
      toast.success('Invoice downloaded as PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try printing instead.');
    }
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    const message = `*INVOICE FROM MIAN & SONS HARDWARE*\n\n` +
      `Invoice #: ${invoice.invoiceNo}\n` +
      `Date: ${new Date(invoice.date).toLocaleDateString()}\n` +
      `Customer: ${invoice.customerName}\n\n` +
      `*ITEMS:*\n` +
      invoice.items.map(item => 
        `${item.srNo}. ${item.productName} (${item.brandModel})\n` +
        `   Qty: ${item.quantity} ${item.unit} @ Rs. ${item.unitPrice.toLocaleString()}\n` +
        `   Amount: Rs. ${item.amount.toLocaleString()}`
      ).join('\n\n') +
      `\n\n*PAYMENT SUMMARY:*\n` +
      `Subtotal: Rs. ${invoice.subtotal.toLocaleString()}\n` +
      `Discount: Rs. ${invoice.discount.toLocaleString()}\n` +
      `Tax: Rs. ${invoice.tax.toLocaleString()}\n` +
      `*Grand Total: Rs. ${invoice.grandTotal.toLocaleString()}*\n\n` +
      `Payment Method: ${invoice.paymentMethod}\n` +
      `Amount Paid: Rs. ${invoice.amountPaid.toLocaleString()}\n` +
      `Balance Due: Rs. ${invoice.balanceDue.toLocaleString()}\n\n` +
      `Thank you for your business!\n` +
      `Mian & Sons Hardware Store`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${invoice.customerPhone?.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    toast.info('Opening WhatsApp...');
  };

  return (
    <div className={isModal ? 'relative' : 'min-h-screen bg-gray-100 dark:bg-gray-900 py-8'}>
      {/* Action Buttons - Hidden when printing */}
      <div className="print:hidden mb-4 flex justify-center gap-3">
        <Button
          variant="primary"
          icon={<FaPrint />}
          onClick={handlePrint}
        >
          Print Invoice
        </Button>
        <Button
          variant="danger"
          icon={<FaDownload />}
          onClick={handleDownloadPDF}
        >
          Download PDF
        </Button>
        <Button
          variant="success"
          icon={<FaWhatsapp />}
          onClick={handleWhatsAppShare}
        >
          Share via WhatsApp
        </Button>
        {isModal && onClose && (
          <Button
            variant="outline"
            icon={<FaTimes />}
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>

      {/* Invoice Content */}
      <div
        ref={invoiceRef}
        className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none print:p-0"
      >
        {/* HEADER */}
        <div className="border-b-4 border-primary pb-6 mb-6">
          <div className="flex justify-between items-start">
            {/* Store Info */}
            <div>
              <h1 className="text-4xl font-bold text-primary mb-2">
                Mian & Sons Hardware
              </h1>
              <p className="text-gray-700 text-sm">59 JB Amin Pur Road, Faisalabad, Pakistan</p>
              <p className="text-gray-700 text-sm">Phone: +92-42-12345678 | Mobile: +92-300-9876543</p>
              <p className="text-gray-700 text-sm">Email: info@mianandsons.com</p>
              <p className="text-gray-700 text-sm">NTN: 1234567-8 | GST: 09-00-1234-567-89</p>
            </div>

            {/* Invoice Title & Details */}
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-800 mb-3">INVOICE</h2>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-gray-800">
                  Invoice #: <span className="text-primary font-mono">{invoice.invoiceNo}</span>
                </p>
                <p className="text-gray-700">
                  Date: {new Date(invoice.date).toLocaleDateString('en-GB')}
                </p>
                <p className="text-gray-700">Time: {invoice.time}</p>
                {invoice.branch && (
                  <p className="text-gray-700">Branch: {invoice.branch}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER INFO BOX */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">BILL TO:</h3>
          <div className="space-y-1">
            <p className="text-gray-900 font-semibold text-lg">{invoice.customerName}</p>
            {invoice.customerAddress && (
              <p className="text-gray-700 text-sm">{invoice.customerAddress}</p>
            )}
            {invoice.customerPhone && (
              <p className="text-gray-700 text-sm">Phone: {invoice.customerPhone}</p>
            )}
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="border border-gray-400 px-3 py-2 text-left text-sm w-12">Sr#</th>
                <th className="border border-gray-400 px-3 py-2 text-left text-sm">Product Name</th>
                <th className="border border-gray-400 px-3 py-2 text-left text-sm">Brand/Model</th>
                <th className="border border-gray-400 px-3 py-2 text-center text-sm w-16">Qty</th>
                <th className="border border-gray-400 px-3 py-2 text-center text-sm w-16">Unit</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm w-24">Unit Price</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm w-24">Discount</th>
                <th className="border border-gray-400 px-3 py-2 text-right text-sm w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.srNo} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                    {item.srNo}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                    {item.productName}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-sm text-gray-700">
                    {item.brandModel}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-sm text-gray-700">
                    {item.unit}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right text-sm text-gray-900">
                    {item.unitPrice.toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right text-sm text-orange-600">
                    {item.discount > 0 ? item.discount.toLocaleString() : '-'}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold text-gray-900">
                    {item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS & PAYMENT SECTION */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Payment Info */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <h4 className="font-bold text-gray-800 mb-3 text-sm">PAYMENT INFORMATION</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Payment Method:</span>
                <span className="font-semibold text-gray-900">{invoice.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Amount Paid:</span>
                <span className="font-semibold text-green-600">
                  Rs. {invoice.amountPaid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-700 font-semibold">Balance Due:</span>
                <span className={`font-bold ${invoice.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Rs. {invoice.balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
            {invoice.cashierName && (
              <p className="text-xs text-gray-600 mt-3">Cashier: {invoice.cashierName}</p>
            )}
          </div>

          {/* Totals Section */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-900">
                  Rs. {invoice.subtotal.toLocaleString()}
                </span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">
                    Discount {invoice.discountPercentage ? `(${invoice.discountPercentage}%)` : ''}:
                  </span>
                  <span className="font-semibold text-orange-600">
                    - Rs. {invoice.discount.toLocaleString()}
                  </span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-700">Tax/GST:</span>
                  <span className="font-semibold text-gray-900">
                    Rs. {invoice.tax.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-3 border-t-2 border-gray-400">
                <span className="text-gray-900 font-bold text-lg">GRAND TOTAL:</span>
                <span className="font-bold text-green-600 text-xl">
                  Rs. {invoice.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AMOUNT IN WORDS */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-gray-800">
            <span className="font-semibold">Amount in Words: </span>
            <span className="italic">{numberToWords(invoice.grandTotal)} Rupees Only</span>
          </p>
        </div>

        {/* FOOTER */}
        <div className="border-t-2 border-gray-300 pt-6 mt-8">
          {/* Thank You Message */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-primary mb-2">
              Thank you for your business!
            </h3>
            <p className="text-sm text-gray-700">
              We appreciate your trust in Mian & Sons Hardware
            </p>
          </div>

          {/* Return Policy */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-6">
            <p className="text-xs font-semibold text-gray-800">
              <span className="text-yellow-700">RETURN POLICY:</span> Goods once sold will not be taken back without receipt. 
              Returns accepted within 7 days for defective items only.
            </p>
          </div>

          {/* Signature Lines */}
          <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-gray-300">
            <div>
              <div className="border-t-2 border-gray-400 pt-2 mt-16">
                <p className="text-center text-sm font-semibold text-gray-700">
                  Customer Signature
                </p>
              </div>
            </div>
            <div>
              <div className="border-t-2 border-gray-400 pt-2 mt-16">
                <p className="text-center text-sm font-semibold text-gray-700">
                  Authorized Signature
                </p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center mt-6 text-xs text-gray-500">
            <p>This is a computer-generated invoice and does not require a signature if issued electronically.</p>
            <p className="mt-1">For any queries, contact us at +92-42-12345678 or email info@mianandsons.com</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          @page {
            size: A4;
            margin: 15mm;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Page breaks */
          .page-break-before {
            page-break-before: always;
          }
          
          .page-break-after {
            page-break-after: always;
          }
          
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
          
          /* Avoid breaking table rows */
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

// Helper function to convert number to words (simplified version)
const numberToWords = (num) => {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  
  if (num < 1000) {
    return convertLessThanThousand(num);
  }
  
  if (num < 100000) { // Thousands
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return convertLessThanThousand(thousands) + ' Thousand' + (remainder ? ' ' + convertLessThanThousand(remainder) : '');
  }
  
  if (num < 10000000) { // Lakhs (Pakistani numbering system)
    const lakhs = Math.floor(num / 100000);
    const remainder = num % 100000;
    let result = convertLessThanThousand(lakhs) + ' Lakh';
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000);
      const finalRemainder = remainder % 1000;
      result += ' ' + convertLessThanThousand(thousands) + ' Thousand';
      if (finalRemainder) result += ' ' + convertLessThanThousand(finalRemainder);
    } else if (remainder > 0) {
      result += ' ' + convertLessThanThousand(remainder);
    }
    return result;
  }
  
  // Crores
  const crores = Math.floor(num / 10000000);
  const remainder = num % 10000000;
  let result = convertLessThanThousand(crores) + ' Crore';
  
  if (remainder >= 100000) {
    const lakhs = Math.floor(remainder / 100000);
    const finalRemainder = remainder % 100000;
    result += ' ' + convertLessThanThousand(lakhs) + ' Lakh';
    if (finalRemainder >= 1000) {
      const thousands = Math.floor(finalRemainder / 1000);
      const lastRemainder = finalRemainder % 1000;
      result += ' ' + convertLessThanThousand(thousands) + ' Thousand';
      if (lastRemainder) result += ' ' + convertLessThanThousand(lastRemainder);
    } else if (finalRemainder > 0) {
      result += ' ' + convertLessThanThousand(finalRemainder);
    }
  } else if (remainder > 0) {
    if (remainder >= 1000) {
      const thousands = Math.floor(remainder / 1000);
      const lastRemainder = remainder % 1000;
      result += ' ' + convertLessThanThousand(thousands) + ' Thousand';
      if (lastRemainder) result += ' ' + convertLessThanThousand(lastRemainder);
    } else {
      result += ' ' + convertLessThanThousand(remainder);
    }
  }
  
  return result;
};

export default Invoice;
