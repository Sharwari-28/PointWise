import { Fragment, useEffect, useMemo, useState } from "react";
import api from "../api";

const fmt = (n) => "₹" + Number(n ?? 0).toFixed(2);
const num = (n) => Number(n || 0);
const pts = (n) => Number(num(n).toFixed(2));
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(ym) {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
}

export default function Reports() {
  const [view, setView] = useState("consultants");
  const [year, setYear] = useState(new Date().getFullYear());
  const [overall, setOverall] = useState([]);
  const [bills, setBills] = useState([]);
  const [search, setSearch] = useState("");
  const [openC, setOpenC] = useState({});
  const [openM, setOpenM] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.all([api.get(`/bills/report?year=${year}`), api.get("/bills")])
      .then(([r, b]) => {
        setOverall(r.data);
        setBills(b.data);
      })
      .catch(() => setError("Could not load the report."));
  }, [year]);

  const consultants = useMemo(() => {
    const map = {};
    const yearText = String(year);

    const ensure = (b) => {
      if (!map[b.downlineId]) {
        map[b.downlineId] = {
          downlineId: b.downlineId,
          consultantId: b.consultantId,
          name: b.downlineName,
          billed: 0, points: 0, received: 0, pending: 0,
          months: {},
        };
      }
      return map[b.downlineId];
    };

    const monthOf = (c, ym) => {
      if (!c.months[ym]) {
        c.months[ym] = { month: ym, orders: [], billed: 0, points: 0, received: 0 };
      }
      return c.months[ym];
    };

    bills.filter((b) => b.status !== "DRAFT").forEach((b) => {
      const c = ensure(b);

      if (b.status === "PENDING" || b.status === "PARTIAL") {
        c.pending += num(b.balance);
      }

      if (b.issuedAt && b.issuedAt.slice(0, 4) === yearText) {
        const m = monthOf(c, b.issuedAt.slice(0, 7));
        m.orders.push(b);
        m.billed += num(b.totalAmount);
        m.points += num(b.totalPoints);
        c.billed += num(b.totalAmount);
        c.points += num(b.totalPoints);
      }

      b.payments.forEach((p) => {
        if (p.paidOn && p.paidOn.slice(0, 4) === yearText) {
          const m = monthOf(c, p.paidOn.slice(0, 7));
          m.received += num(p.amount);
          c.received += num(p.amount);
        }
      });
    });

    return Object.values(map)
      .map((c) => ({
        ...c,
        monthList: Object.values(c.months).sort((a, b) => b.month.localeCompare(a.month)),
      }))
      .filter((c) => c.monthList.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bills, year]);

  const shown = consultants.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) ||
           (c.consultantId || "").toLowerCase().includes(q);
  });

  const total = (field) => shown.reduce((t, c) => t + c[field], 0);

  const toggleC = (id) => setOpenC({ ...openC, [id]: !openC[id] });
  const toggleM = (key) => setOpenM({ ...openM, [key]: !openM[key] });

  const sum = (field) => overall.reduce((t, r) => t + num(r[field]), 0);

  return (
    <>
      <div className="page-head">
        <h2>Reports</h2>
        <div className="year-pick">
          <button className="secondary" onClick={() => setYear(year - 1)}>◀</button>
          <strong>{year}</strong>
          <button className="secondary" onClick={() => setYear(year + 1)}>▶</button>
        </div>
      </div>

      <div className="tabs">
        <button className={view === "consultants" ? "tab active-tab" : "tab"}
                onClick={() => setView("consultants")}>By consultant</button>
        <button className={view === "overall" ? "tab active-tab" : "tab"}
                onClick={() => setView("overall")}>Overall by month</button>
      </div>

      {error && <p className="error">{error}</p>}

      {view === "consultants" && (
        <>
          <div className="report-tools">
            <input placeholder="Search consultant ID or name" value={search}
                   onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Consultant ID</th>
                  <th>Name</th>
                  <th>Billed ({year})</th>
                  <th>Points ({year})</th>
                  <th>Received ({year})</th>
                  <th>Pending now</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((c) => (
                  <Fragment key={c.downlineId}>
                    <tr className="clickable" onClick={() => toggleC(c.downlineId)}>
                      <td>{openC[c.downlineId] ? "▼" : "▶"}</td>
                      <td>{c.consultantId || "-"}</td>
                      <td>{c.name}</td>
                      <td>{fmt(c.billed)}</td>
                      <td>{pts(c.points)}</td>
                      <td>{fmt(c.received)}</td>
                      <td>{fmt(c.pending)}</td>
                    </tr>

                    {openC[c.downlineId] && (
                      <tr>
                        <td colSpan="7" className="nested">
                          {c.monthList.map((m) => {
                            const key = `${c.downlineId}-${m.month}`;
                            return (
                              <div className="month-block" key={key}>
                                <div className="month-head" onClick={() => toggleM(key)}>
                                  <span>{openM[key] ? "▼" : "▶"} {monthLabel(m.month)}</span>
                                  <span>{m.orders.length} order(s)</span>
                                  <span>Billed {fmt(m.billed)}</span>
                                  <span>Points {pts(m.points)}</span>
                                  <span>Received {fmt(m.received)}</span>
                                </div>

                                {openM[key] && (
                                  <div className="month-body">
                                    {m.orders.length === 0 ? (
                                      <p className="muted">
                                        No orders placed this month. Payments received: {fmt(m.received)}.
                                      </p>
                                    ) : (
                                      <div className="table-wrap">
                                        <table>
                                          <thead>
                                            <tr>
                                              <th>Bill</th>
                                              <th>Date</th>
                                              <th>Items</th>
                                              <th>Points</th>
                                              <th>Amount</th>
                                              <th>Paid</th>
                                              <th>Balance</th>
                                              <th>Status</th>
                                              <th></th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {m.orders
                                              .slice()
                                              .sort((a, b) => a.id - b.id)
                                              .map((o) => (
                                                <tr key={o.id}>
                                                  <td>{o.billNo}</td>
                                                  <td>{(o.issuedAt || "").slice(0, 10)}</td>
                                                  <td>
                                                    {o.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                                                  </td>
                                                  <td>{pts(o.totalPoints)}</td>
                                                  <td>{fmt(o.totalAmount)}</td>
                                                  <td>{fmt(o.amountPaid)}</td>
                                                  <td>{fmt(o.balance)}</td>
                                                  <td><span className={`badge ${o.status}`}>{o.status}</span></td>
                                                  <td>
                                                    <a href={`/b/${o.shareToken}`} target="_blank" rel="noreferrer">View</a>
                                                  </td>
                                                </tr>
                                              ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}

                {shown.length === 0 && (
                  <tr><td colSpan="7">No orders or payments in {year}</td></tr>
                )}
              </tbody>

              {shown.length > 0 && (
                <tfoot>
                  <tr>
                    <td></td>
                    <td></td>
                    <td>Total</td>
                    <td>{fmt(total("billed"))}</td>
                    <td>{pts(total("points"))}</td>
                    <td>{fmt(total("received"))}</td>
                    <td>{fmt(total("pending"))}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <p className="muted">
            Click a consultant to see their months, then a month to see every order placed in it.
            "Pending now" is the unpaid balance across all months. Points are counted in the month the order was placed.
          </p>
        </>
      )}

      {view === "overall" && (
        <>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Opening</th>
                  <th>Billed</th>
                  <th>Points</th>
                  <th>Received</th>
                  <th>Closing</th>
                  <th>Bills</th>
                </tr>
              </thead>
              <tbody>
                {overall.map((r, i) => (
                  <tr key={r.month}>
                    <td>{MONTH_NAMES[i]}</td>
                    <td>{fmt(r.opening)}</td>
                    <td>{fmt(r.billed)}</td>
                    <td>{pts(r.points)}</td>
                    <td>{fmt(r.received)}</td>
                    <td>{fmt(r.closing)}</td>
                    <td>{r.billCount}</td>
                  </tr>
                ))}
              </tbody>
              {overall.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Year total</td>
                    <td>{fmt(overall[0].opening)}</td>
                    <td>{fmt(sum("billed"))}</td>
                    <td>{pts(sum("points"))}</td>
                    <td>{fmt(sum("received"))}</td>
                    <td>{fmt(overall[overall.length - 1].closing)}</td>
                    <td>{sum("billCount")}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <p className="muted">
            Opening and closing show the money balance carried between months.
          </p>
        </>
      )}
    </>
  );
}