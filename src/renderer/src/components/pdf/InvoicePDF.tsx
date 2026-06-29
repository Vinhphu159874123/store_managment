import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// ─── Import local Roboto font files (full Vietnamese Unicode support) ────────
import RobotoRegular from '../../assets/fonts/Roboto-Regular.ttf'
import RobotoBold from '../../assets/fonts/Roboto-Bold.ttf'
import RobotoItalic from '../../assets/fonts/Roboto-Italic.ttf'

Font.register({
  family: 'Roboto',
  fonts: [
    { src: RobotoRegular, fontWeight: 'normal' },
    { src: RobotoBold, fontWeight: 'bold' },
    { src: RobotoItalic, fontStyle: 'italic' }
  ]
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + 'đ'
}

function formatDateVN(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr.replace(' ', 'T'))
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}  ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

// ─── Store constants ────────────────────────────────────────────────────────
const STORE = {
  name: 'Cửa Hàng Thi',
  tagline: 'Vật Tư Nông Nghiệp - Vật Liệu Xây Dựng',
  address: 'An Bình, Vĩnh Long',
  phones: ['0939 587 899', '0795 921 716'],
  specialties: 'Phân bón · Thức ăn · Gạo · Gas · Cát · Đá · Xi măng · Gạch · Trang trí nội thất'
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  dark: '#1a1a2e',
  accent: '#2d6a4f',
  accentLight: '#d8f3dc',
  muted: '#6c757d',
  border: '#dee2e6',
  borderDark: '#495057',
  danger: '#c0392b',
  white: '#ffffff',
  bg: '#f8f9fa'
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 9,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
    color: C.dark
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerWrap: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottom: `2px solid ${C.accent}`
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5
  },
  headerLeft: { flex: 1 },
  storeName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: C.accent,
    letterSpacing: 0.5,
    marginBottom: 2
  },
  storeTagline: {
    fontSize: 8,
    color: C.muted,
    fontStyle: 'italic',
    marginBottom: 3
  },
  storeAddress: {
    fontSize: 8,
    color: C.dark,
    marginBottom: 1
  },
  headerRight: {
    alignItems: 'flex-end'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  phoneLabel: {
    fontSize: 7,
    color: C.muted,
    marginRight: 4
  },
  phoneValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: C.dark
  },
  specialtiesBar: {
    backgroundColor: C.accentLight,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginTop: 4
  },
  specialtiesText: {
    fontSize: 7,
    color: C.accent,
    fontStyle: 'italic',
    textAlign: 'center'
  },

  // ── Invoice title ────────────────────────────────────────────────────────
  titleSection: {
    alignItems: 'center',
    marginVertical: 8
  },
  invoiceTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: C.dark,
    letterSpacing: 1
  },
  invoiceNumberBadge: {
    backgroundColor: C.bg,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginTop: 3,
    border: `1px solid ${C.border}`
  },
  invoiceNumberText: {
    fontSize: 8,
    color: C.muted
  },

  // ── Customer info ─────────────────────────────────────────────────────────
  infoSection: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
    border: `1px solid ${C.border}`
  },
  infoCol: { flex: 1 },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3
  },
  infoLabel: {
    width: 64,
    fontSize: 8,
    color: C.muted
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: C.dark
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: { marginBottom: 6 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.accent,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 2
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 8,
    color: C.white
  },
  tableRowOdd: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: C.white,
    borderBottom: `1px solid ${C.border}`
  },
  tableRowEven: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: C.bg,
    borderBottom: `1px solid ${C.border}`
  },
  tableRowText: { fontSize: 8, color: C.dark },

  colNo:    { width: '5%',  textAlign: 'center' },
  colName:  { width: '38%' },
  colQty:   { width: '9%',  textAlign: 'center' },
  colUnit:  { width: '9%',  textAlign: 'center' },
  colPrice: { width: '19%', textAlign: 'right' },
  colDisc:  { width: '7%',  textAlign: 'center' },
  colTotal: { width: '19%', textAlign: 'right' },

  // ── Summary ───────────────────────────────────────────────────────────────
  summaryWrap: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  summaryBox: {
    width: 210,
    border: `1px solid ${C.border}`,
    borderRadius: 3,
    overflow: 'hidden'
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottom: `1px solid ${C.border}`
  },
  summaryLabel: {
    flex: 1,
    fontSize: 8,
    color: C.muted
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'right',
    width: 80
  },
  totalRowBox: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: C.accent
  },
  totalLabel: {
    flex: 1,
    fontSize: 10,
    fontWeight: 'bold',
    color: C.white
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.white,
    textAlign: 'right',
    width: 80
  },
  debtRowBox: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff0f0'
  },
  debtLabel: {
    flex: 1,
    fontSize: 8,
    fontWeight: 'bold',
    color: C.danger
  },
  debtValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: C.danger,
    textAlign: 'right',
    width: 80
  },

  // ── Notes ─────────────────────────────────────────────────────────────────
  notesBox: {
    marginTop: 8,
    padding: 6,
    backgroundColor: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 2
  },
  notesText: {
    fontSize: 7.5,
    color: C.muted,
    fontStyle: 'italic'
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    marginTop: 14,
    paddingTop: 8,
    borderTop: `1px solid ${C.border}`,
    textAlign: 'center'
  },
  footerText: {
    fontSize: 8,
    color: C.muted
  },
  footerBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color: C.accent,
    marginTop: 1
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    borderBottom: `1px dashed ${C.border}`,
    marginVertical: 6
  }
})

// ─── Component ────────────────────────────────────────────────────────────────
interface InvoicePDFProps {
  invoice: any
  storeSettings: Record<string, string>
}

export default function InvoicePDF({ invoice, storeSettings }: InvoicePDFProps): JSX.Element {
  // Prefer user settings, fall back to store constants
  const storeName    = storeSettings.store_name    || STORE.name
  const storeAddress = storeSettings.store_address || STORE.address
  const storePhone   = storeSettings.store_phone
  const items        = invoice.items || []

  return (
    <Document>
      <Page size="A5" style={styles.page}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <View style={styles.headerWrap}>
          <View style={styles.headerTop}>
            {/* Left: Store identity */}
            <View style={styles.headerLeft}>
              <Text style={styles.storeName}>{storeName.toUpperCase()}</Text>
              <Text style={styles.storeTagline}>{STORE.tagline}</Text>
              <Text style={styles.storeAddress}>Địa chỉ: {storeAddress}</Text>
            </View>

            {/* Right: Phones */}
            <View style={styles.headerRight}>
              {(storePhone ? storePhone.split(/[-,]/).map((p: string) => p.trim()) : STORE.phones).map(
                (phone: string, pi: number) => (
                  <View key={pi} style={styles.phoneRow}>
                    <Text style={styles.phoneLabel}>ĐT:</Text>
                    <Text style={styles.phoneValue}>{phone}</Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* Specialties bar */}
          <View style={styles.specialtiesBar}>
            <Text style={styles.specialtiesText}>
              Chuyên: {STORE.specialties}
            </Text>
          </View>
        </View>

        {/* ── INVOICE TITLE ──────────────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.invoiceTitle}>HÓA ĐƠN BÁN HÀNG</Text>
          <View style={styles.invoiceNumberBadge}>
            <Text style={styles.invoiceNumberText}>Số: {invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* ── CUSTOMER INFO ──────────────────────────────────────────────── */}
        <View style={styles.infoSection}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Khách hàng:</Text>
              <Text style={styles.infoValue}>{invoice.customerNameSnapshot || 'Khách lẻ'}</Text>
            </View>
            {invoice.customerPhoneSnapshot ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Điện thoại:</Text>
                <Text style={styles.infoValue}>{invoice.customerPhoneSnapshot}</Text>
              </View>
            ) : null}
            {invoice.customerAddressSnapshot ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Địa chỉ:</Text>
                <Text style={styles.infoValue}>{invoice.customerAddressSnapshot}</Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ngày:  </Text>
              <Text style={styles.infoValue}>{formatDateVN(invoice.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Loại bán:</Text>
              <Text style={styles.infoValue}>
                {invoice.saleType === 'retail' ? 'Bán lẻ' : 'Bán sỉ'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── ITEMS TABLE ────────────────────────────────────────────────── */}
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNo]}>STT</Text>
            <Text style={[styles.tableHeaderText, styles.colName]}>Sản phẩm</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>SL</Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>ĐVT</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>Đơn giá</Text>
            <Text style={[styles.tableHeaderText, styles.colDisc]}>CK%</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Thành tiền</Text>
          </View>

          {/* Data rows */}
          {items.map((item: any, index: number) => {
            const rowStyle = index % 2 === 0 ? styles.tableRowOdd : styles.tableRowEven
            return (
              <View key={index} style={rowStyle}>
                <Text style={[styles.tableRowText, styles.colNo]}>{index + 1}</Text>
                <Text style={[styles.tableRowText, styles.colName]}>{item.productNameSnapshot}</Text>
                <Text style={[styles.tableRowText, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableRowText, styles.colUnit]}>{item.unitNameSnapshot || '-'}</Text>
                <Text style={[styles.tableRowText, styles.colPrice]}>{formatVND(item.unitPrice)}</Text>
                <Text style={[styles.tableRowText, styles.colDisc]}>
                  {item.discountPercent > 0 ? `${item.discountPercent}%` : ''}
                </Text>
                <Text style={[styles.tableRowText, styles.colTotal, { fontWeight: 'bold' }]}>
                  {formatVND(item.lineTotal)}
                </Text>
              </View>
            )
          })}
        </View>

        {/* ── SUMMARY ────────────────────────────────────────────────────── */}
        <View style={styles.summaryWrap}>
          <View style={styles.summaryBox}>
            {/* Subtotal */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tạm tính</Text>
              <Text style={styles.summaryValue}>{formatVND(invoice.subtotal)}</Text>
            </View>

            {/* Discount — only if present */}
            {invoice.discountAmount > 0 ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Giảm giá</Text>
                <Text style={[styles.summaryValue, { color: '#d97706' }]}>
                  -{formatVND(invoice.discountAmount)}
                </Text>
              </View>
            ) : null}

            {/* Total */}
            <View style={styles.totalRowBox}>
              <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
              <Text style={styles.totalValue}>{formatVND(invoice.totalAmount)}</Text>
            </View>

            {/* Paid */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Đã thanh toán</Text>
              <Text style={[styles.summaryValue, { color: '#2d6a4f' }]}>
                {formatVND(invoice.paidAmount)}
              </Text>
            </View>

            {/* Debt — only if present */}
            {invoice.debtAmount > 0 ? (
              <View style={styles.debtRowBox}>
                <Text style={styles.debtLabel}>Còn nợ</Text>
                <Text style={styles.debtValue}>{formatVND(invoice.debtAmount)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── NOTES ──────────────────────────────────────────────────────── */}
        {invoice.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>Ghi chú: {invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Cảm ơn quý khách đã tin tưởng mua hàng!</Text>
          <Text style={styles.footerBold}>
            Hẹn gặp lại - {storeName} | ĐT: {storePhone || STORE.phones.join(' - ')}
          </Text>
        </View>

      </Page>
    </Document>
  )
}
