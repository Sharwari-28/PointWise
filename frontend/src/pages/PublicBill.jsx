import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { UPI_ID, PAYEE_NAME } from "../config";

const fmt = (n) => "₹" + Number(n ?? 0).toFixed(2);

export default function PublicBill() {
  const { token } = useParams();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");

  // ask search engines not to index bill pages
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => document.head.removeChild(meta);
  }, []);

  useEffect(() => {
    api.get(`/public/bills/${token}`)
      .then((res) => setBill(res.data))
      .catch(() => setError("This bill link is not valid."));
  }, [token]);

  if (error) return <div className="bill-page"><p className="error">{error}</p></div>;
  if (!bill) return <div className="bill-page"><p>Loading...</p></div>;

  const isDraft = bill.status === "DRAFT";
  const due = Number(bill.amountDue);
  const canPay = !isDraft && due > 0;
  const title = isDraft ? "Estimate" : `Bill ${bill.billNo}`;

  const upiLink =
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
    `&pn=${encodeURIComponent(PAYEE_NAME)}` +
    `&am=${due.toFixed(2)}&cu=INR` +
    `&tn=${encodeURIComponent(isDraft ? "Estimate" : "Bill " + bill.billNo)}`;

  const url = window.location.href;
  const text = `${title} for ${bill.downlineName} - ${PAYEE_NAME}`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: text, text, url }); } catch { /* cancelled */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Link copied");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <div className="bill-page">
      <div className="card bill-card">
        <div className="bill-header">
          <div>
            <h2>{title}</h2>
            {isDraft && <p className="muted">This is an estimate, not a bill.</p>}
          </div>
          <span className={`badge ${bill.status}`}>{bill.status}</span>
        </div>

        <p><strong>{bill.downlineName}</strong></p>
        {bill.brandPartner && <p className="muted">Brand partner: {bill.brandPartner}</p>}
        {bill.issuedAt && <p className="muted">Date: {bill.issuedAt.slice(0, 10)}</p>}

        <table>
          <thead>
            <tr><th>Product</th><th>Qty</th><th>Points</th><th>Price</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {bill.items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.productName}</td>
                <td>{i.quantity}</td>
                <td>{i.linePoints}</td>
                <td>{fmt(i.price)}</td>
                <td>{fmt(i.lineAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bill-totals">
          <div><span>This order</span><strong>{fmt(bill.totalAmount)}</strong></div>
          {!isDraft && Number(bill.previousBalance) > 0 && (
            <div><span>Previous balance</span><strong>{fmt(bill.previousBalance)}</strong></div>
          )}
          {!isDraft && Number(bill.amountPaid) > 0 && (
            <div><span>Paid on this bill</span><strong>- {fmt(bill.amountPaid)}</strong></div>
          )}
          {!isDraft && (
            <div className="grand"><span>Total payable</span><strong>{fmt(due)}</strong></div>
          )}
          <div className="points"><span>Total points (this order)</span><strong>{bill.totalPoints}</strong></div>
{Number(bill.previousMonthPoints) > 0 && (
  <div className="points"><span>Points earlier this month</span><strong>{bill.previousMonthPoints}</strong></div>
)}
<div className="points"><span>Total points this month</span><strong>{bill.monthPointsTotal}</strong></div>
        </div>

        {canPay && (
          <div className="pay-box">
            <a className="pay-btn" href={upiLink}>Pay {fmt(due)} with UPI</a>
            <p className="muted">Opens GPay, Paytm or PhonePe on your phone.</p>
            <div className="qr"><QRCodeSVG value={upiLink} size={170} /></div>
            <p className="muted">On a computer, scan this QR code with your phone.</p>
          </div>
        )}

        {!isDraft && due <= 0 && <p className="success">Fully paid. Thank you!</p>}

        <div className="share-row">
          <button className="secondary" onClick={share}>Share</button>
          <button className="secondary" onClick={copyLink}>Copy link</button>
        </div>
      </div>
    </div>
  );
}