import { useEffect, useState } from "react";
import api from "../api";

const fmt = (n) => "₹" + Number(n ?? 0).toFixed(2);
const TABS = ["Pending", "Paid", "Drafts"];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function Dashboard() {
  const [bills, setBills] = useState([]);
  const [summary, setSummary] = useState(null);
  const [report, setReport] = useState([]);
  const [pointsRows, setPointsRows] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [tab, setTab] = useState("Pending");
  const [error, setError] = useState("");

  const year = month.slice(0, 4);

  const load = () => {
    Promise.all([
      api.get("/bills"),
      api.get("/bills/summary"),
      api.get(`/bills/report?year=${year}`),
      api.get(`/bills/points?month=${month}`),
    ])
      .then(([b, s, r, p]) => {
        setBills(b.data);
        setSummary(s.data);
        setReport(r.data);
        setPointsRows(p.data);
      })
      .catch(() => setError("Cannot reach the backend. Is it running?"));
  };

  useEffect(load, [month]);

  const row = report.find((r) => r.month === month);

  const showError = (err) => {
    const data = err.response?.data;
    setError(data?.message || "Something went wrong");
  };

  const recordPayment = (b) => {
    const input = window.prompt(
      `Amount received for ${b.billNo} (balance ${fmt(b.balance)})`,
      b.balance
    );
    if (input === null) return;
    const amount = Number(input);
    if (!(amount > 0)) return setError("Enter an amount above 0.");
    setError("");
    api.post(`/bills/${b.id}/payments`, { amount, note: "Recorded manually" })
      .then(load)
      .catch(showError);
  };

  const convert = (b) => {
    setError("");
    api.post(`/bills/${b.id}/convert`).then(load).catch(showError);
  };

  const removeDraft = (b) => {
    if (!window.confirm("Delete this draft?")) return;
    setError("");
    api.delete(`/bills/${b.id}/draft`).then(load).catch(showError);
  };

  const shareBill = async (b) => {
    const url = `${window.location.origin}/b/${b.shareToken}`;
    const text = b.status === "DRAFT" ? `Estimate for ${b.downlineName}` : `Bill ${b.billNo}`;
    if (navigator.share) {
      try { await navigator.share({ title: text, text, url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        window.alert("Link copied:\n" + url);
      } catch {
        window.prompt("Copy this link:", url);
      }
    }
  };

  const visible = bills
    .filter((b) => {
      if (tab === "Pending") return b.status === "PENDING" || b.status === "PARTIAL";
      if (tab === "Paid") return b.status === "PAID" && (b.paidAt || "").slice(0, 7) === month;
      return b.status === "DRAFT";
    })
    .sort((a, b) => b.id - a.id);

  return (
    <>
      <div className="page-head">
        <h2>Dashboard</h2>
        <label className="month-pick">
          Month
          <input type="month" value={month}
                 onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </div>

      {row && (
        <div className="stats">
          <div className="card stat">
            <span>Opening balance (carried forward)</span>
            <strong>{fmt(row.opening)}</strong>
          </div>
          <div className="card stat">
            <span>Billed this month</span>
            <strong>{fmt(row.billed)}</strong>
          </div>
          <div className="card stat">
            <span>Received this month</span>
            <strong>{fmt(row.received)}</strong>
          </div>
          <div className="card stat">
            <span>Closing balance</span>
            <strong>{fmt(row.closing)}</strong>
          </div>
          <div className="card stat">
            <span>Points this month</span>
            <strong>{row.points}</strong>
          </div>
          <div className="card stat">
            <span>Bills paid this month</span>
            <strong>{row.paidBillCount}</strong>
          </div>
        </div>
      )}

      {summary && (
        <p className="muted">
          Pending right now (all months): <strong>{fmt(summary.totalPending)}</strong>
          {" "}across {summary.pendingCount + summary.partialCount} bill(s)
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <div className="card table-wrap">
        <h3>Points by downline ({month})</h3>
        <table>
          <thead>
            <tr><th>Downline</th><th>Bills</th><th>Billed</th><th>Points</th></tr>
          </thead>
          <tbody>
            {pointsRows.map((p) => (
              <tr key={p.downlineId}>
                <td>{p.downlineName}</td>
                <td>{p.billCount}</td>
                <td>{fmt(p.billed)}</td>
                <td>{p.points}</td>
              </tr>
            ))}
            {pointsRows.length === 0 && (
              <tr><td colSpan="4">No bills issued this month</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={t === tab ? "tab active-tab" : "tab"}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Paid" && <p className="muted">Showing bills fully paid in the selected month.</p>}
      {tab === "Pending" && <p className="muted">Showing all unpaid and part-paid bills, from every month.</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Bill</th>
              <th>Downline</th>
              <th>Date</th>
              <th>Points</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((b) => (
              <tr key={b.id}>
                <td>{b.billNo || `Draft #${b.id}`}</td>
                <td>{b.downlineName}</td>
                <td>{(b.issuedAt || b.createdAt || "").slice(0, 10)}</td>
                <td>{b.totalPoints}</td>
                <td>{fmt(b.totalAmount)}</td>
                <td>{fmt(b.amountPaid)}</td>
                <td>{b.status === "DRAFT" ? "-" : fmt(b.balance)}</td>
                <td><span className={`badge ${b.status}`}>{b.status}</span></td>
                <td className="row-actions">
                  <button className="secondary" onClick={() => shareBill(b)}>Share</button>
                  {(b.status === "PENDING" || b.status === "PARTIAL") && (
                    <button onClick={() => recordPayment(b)}>Record payment</button>
                  )}
                  {b.status === "DRAFT" && (
                    <>
                      <button onClick={() => convert(b)}>Convert to bill</button>
                      <button className="danger" onClick={() => removeDraft(b)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan="9">Nothing here yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}