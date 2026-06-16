import type { InvoiceData } from "@/lib/invoice";

const AC_WHATSAPP = "25769034965";

export function getTrackingUrl(orderCode: string): string {
  const base = window.location.origin;
  return `${base}/track/${orderCode}`;
}

export function buildClientWhatsAppMessage(data: InvoiceData): string {
  const itemsList = data.items
    .map(i => `• ${i.name} ×${i.quantity} — ${(i.unitPrice * i.quantity).toLocaleString()} BIF`)
    .join("\n");

  const trackingUrl = getTrackingUrl(data.orderCode);

  return [
    `🍽️ *Nouvelle commande - American Corner Restaurant*`,
    ``,
    `👤 *Sender:* ${data.visitorName || data.visitorId}`,
    `📋 *Code:* ${data.orderCode}`,
    `🪑 *Table:* ${data.tableNumber}`,
    ``,
    `*Articles:*`,
    itemsList,
    ``,
    `💰 *Total:* ${data.totalAmount.toLocaleString()} BIF`,
    ``,
    `📎 *Facture:* ${trackingUrl}`,
    ``,
    `Merci de confirmer ma commande 🙏`,
  ].join("\n");
}

export function openClientWhatsApp(data: InvoiceData) {
  const msg = buildClientWhatsAppMessage(data);
  const url = `https://wa.me/${AC_WHATSAPP}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
}

export function buildStaffConfirmationMessage(order: {
  order_code: string;
  visitor_id: string;
  table_number: number;
  total_amount: number;
  status: string;
}, statusLabel: string): string {
  const trackingUrl = getTrackingUrl(order.order_code);

  return [
    `✅ *Order update - American Corner Restaurant*`,
    ``,
    `📋 *Commande:* ${order.order_code}`,
    `👤 *Client:* ${order.visitor_id}`,
    `🪑 *Table:* ${order.table_number}`,
    ``,
    `📌 *Statut:* ${statusLabel}`,
    `💰 *Total:* ${order.total_amount.toLocaleString()} BIF`,
    ``,
    `🔗 *Suivre la commande:* ${trackingUrl}`,
  ].join("\n");
}
