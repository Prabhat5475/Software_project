import React, { useEffect, useState } from "react";

const nowFmt = (iso) => (iso ? new Date(iso).toLocaleString() : "");
const uid = (p = "") => p + Date.now().toString(36);

const SAMPLE_DOCTORS = [
  {
    id: "d1",
    name: "Dr. Asha Sen",
    specialty: "Cardiologist",
    exp: 12,
    fee: 700,
    loc: "Howrah",
    bio: "Expert in coronary care.",
    slots: [],
    reviews: []
  },
  {
    id: "d2",
    name: "Dr. Rahul Mehta",
    specialty: "General Physician",
    exp: 8,
    fee: 400,
    loc: "Kolkata",
    bio: "Family physician and general care.",
    slots: [],
    reviews: []
  }
];

const mkSlots = () => {
  const out = [];
  const base = new Date();
  for (let d = 0; d < 5; d++) {
    for (const h of [10, 14, 17]) {
      out.push(
        new Date(
          base.getFullYear(),
          base.getMonth(),
          base.getDate() + d,
          h,
          0,
          0
        ).toISOString()
      );
    }
  }
  return out;
};

const K_USERS = "oda_users_v1";
const K_DOCS = "oda_docs_v1";
const K_APPTS = "oda_appts_v1";
const K_PAY = "oda_pay_v1";
const K_NOTIF = "oda_note_v1";
const K_AUTH = "oda_auth_v1";

export default function App() {
  const [users, setUsers] = useState([]);
  const [docs, setDocs] = useState([]);
  const [appts, setAppts] = useState([]);
  const [pays, setPays] = useState([]);
  const [notes, setNotes] = useState([]);
  const [auth, setAuth] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const lu = localStorage.getItem(K_USERS);
    const ld = localStorage.getItem(K_DOCS);
    const la = localStorage.getItem(K_APPTS);
    const lp = localStorage.getItem(K_PAY);
    const ln = localStorage.getItem(K_NOTIF);
    const lauth = localStorage.getItem(K_AUTH);

    if (lu && ld) {
      setUsers(JSON.parse(lu));
      setDocs(JSON.parse(ld));
    } else {
      const seedUsers = [
        { id: "u_pat", name: "Demo Patient", email: "demo@patient.com", pass: "patient", role: "patient" },
        { id: "u_doc", name: "Demo Doctor", email: "demo@doctor.com", pass: "doctor", role: "doctor" },
        { id: "u_admin", name: "Admin", email: "admin@admin.com", pass: "admin", role: "admin" }
      ];
      const seedDocs = SAMPLE_DOCTORS.map((d, i) => ({
        ...d,
        id: "d" + (i + 1),
        slots: mkSlots(),
        reviews: []
      }));
      seedDocs[0].id = "d_demo";
      seedDocs[0].name = "Dr. Demo";

      localStorage.setItem(K_USERS, JSON.stringify(seedUsers));
      localStorage.setItem(K_DOCS, JSON.stringify(seedDocs));
      setUsers(seedUsers);
      setDocs(seedDocs);
    }

    if (la) setAppts(JSON.parse(la));
    if (lp) setPays(JSON.parse(lp));
    if (ln) setNotes(JSON.parse(ln));
    if (lauth) setAuth(JSON.parse(lauth));
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const saveUsers = (x) => { setUsers(x); localStorage.setItem(K_USERS, JSON.stringify(x)); };
  const saveDocs = (x) => { setDocs(x); localStorage.setItem(K_DOCS, JSON.stringify(x)); };
  const saveAppts = (x) => { setAppts(x); localStorage.setItem(K_APPTS, JSON.stringify(x)); };
  const savePays = (x) => { setPays(x); localStorage.setItem(K_PAY, JSON.stringify(x)); };
  const saveNotes = (x) => { setNotes(x); localStorage.setItem(K_NOTIF, JSON.stringify(x)); };
  const setAuthAndStore = (u) => { setAuth(u); if (u) localStorage.setItem(K_AUTH, JSON.stringify(u)); else localStorage.removeItem(K_AUTH); };

  function register({ name, email, pass, role, specialty, loc, fee }) {
    if (users.find((u) => u.email === email)) return setToast("Email already used");
    const newUser = { id: uid("u_"), name, email, pass, role };
    saveUsers([newUser, ...users]);

    if (role === "doctor") {
      const newDoc = {
        id: uid("d_"),
        name,
        specialty: specialty || "General",
        exp: 0,
        fee: fee || 0,
        loc: loc || "",
        bio: "",
        slots: mkSlots(),
        reviews: []
      };
      saveDocs([newDoc, ...docs]);
    }
    setToast("Registered successfully");
  }

  function login({ email, pass }) {
    const u = users.find((x) => x.email === email && x.pass === pass);
    if (!u) return setToast("Invalid credentials");
    setAuthAndStore({ id: u.id, name: u.name, email: u.email, role: u.role });
    setToast("Logged in");
  }

  function logout() {
    setAuthAndStore(null);
    setToast("Logged out");
  }

  const specialtiesList = ["All", ...Array.from(new Set(docs.map((d) => d.specialty || "General")))];

  const visibleDocs = docs.filter((d) => {
    const mQ = q === "" || d.name.toLowerCase().includes(q.toLowerCase()) || d.specialty.toLowerCase().includes(q.toLowerCase());
    const mF = filter === "All" || d.specialty === filter;
    return mQ && mF;
  });

  function notify(t) {
    const n = { id: uid("n_"), text: t, at: new Date().toISOString() };
    saveNotes([n, ...notes]);
  }

  function bookAppointment({ docId, slot }) {
    if (!auth || auth.role !== "patient") return setToast("Login as patient first");
    const taken = appts.find((a) => a.docId === docId && a.slot === slot && a.status === "Confirmed");
    if (taken) return setToast("Slot already taken");
    const ap = { id: uid("a_"), docId, slot, patientId: auth.id, status: "Pending" };
    saveAppts([ap, ...appts]);
    notify("Appointment requested");
    setToast("Appointment requested");
  }

  function simulatePayment(apptId) {
    const appt = appts.find((a) => a.id === apptId);
    if (!appt) return;

    const doc = docs.find((d) => d.id === appt.docId);
    const pay = { id: uid("p_"), apptId, amount: doc.fee, status: "Paid", at: new Date().toISOString() };
    savePays([pay, ...pays]);

    const updated = appts.map((a) => a.id === apptId ? { ...a, status: "Confirmed" } : a);
    saveAppts(updated);

    notify("Appointment confirmed");
    setToast("Payment successful");
  }

  function cancelAppointment(apptId) {
    const updated = appts.map((a) => a.id === apptId ? { ...a, status: "Cancelled" } : a);
    saveAppts(updated);
    notify("Appointment cancelled");
    setToast("Cancelled");
  }

  function doctorConfirm(apptId) {
    const updated = appts.map((a) => a.id === apptId ? { ...a, status: "ConfirmedByDoctor" } : a);
    saveAppts(updated);
    notify("Doctor confirmed appointment");
    setToast("Confirmed by doctor");
  }

  function resetAll() {
    localStorage.clear();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Online Doctor Appointment Booking System</h1>

          {auth ? (
            <div className="flex gap-2 items-center">
              <span>{auth.name} ({auth.role})</span>
              <button onClick={logout} className="px-3 py-1 border rounded">Logout</button>
            </div>
          ) : (
            <AuthPanel onLogin={login} onRegister={register} />
          )}
        </header>

        <main className="grid lg:grid-cols-3 gap-6">

          <section className="lg:col-span-2">
            <div className="p-4 bg-white rounded shadow">

              <div className="flex gap-2 mb-4">
                <input
                  className="p-2 border flex-1"
                  placeholder="Search doctors"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />

                <select className="p-2 border" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  {specialtiesList.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <button onClick={resetAll} className="px-3 bg-black text-white rounded">Reset</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {visibleDocs.map((d) => (
                  <div key={d.id} className="p-3 border rounded">
                    <div className="font-bold">{d.name}</div>
                    <div className="text-sm text-gray-600">{d.specialty} • {d.loc}</div>
                    <div className="text-sm">Fee: ₹{d.fee}</div>

                    <div className="mt-2 flex gap-2">
                      <button className="px-3 py-1 border rounded" onClick={() => setViewDoc(d)}>
                        View
                      </button>
                      <button
                        className="px-3 py-1 bg-green-600 text-white rounded"
                        onClick={() => {
                          if (!auth || auth.role !== "patient") return setToast("Login as patient");
                          const free = d.slots.find(
                            (s) => !appts.find((a) => a.slot === s && (a.status === "Confirmed" || a.status === "ConfirmedByDoctor"))
                          );
                          if (!free) return setToast("No free slots");
                          bookAppointment({ docId: d.id, slot: free });
                        }}
                      >
                        Quick Book
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {viewDoc && (
              <div className="mt-4 p-4 bg-white rounded shadow">
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-lg font-bold">{viewDoc.name}</h2>
                    <div className="text-sm text-gray-600">{viewDoc.specialty} • Fee ₹{viewDoc.fee}</div>
                  </div>
                  <button onClick={() => setViewDoc(null)} className="text-sm">Close</button>
                </div>

                <h3 className="font-semibold mt-4 mb-2">Slots</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {viewDoc.slots.map((s) => {
                    const taken = appts.find((a) => a.docId === viewDoc.id && a.slot === s && (a.status === "Confirmed" || a.status === "ConfirmedByDoctor"));
                    return (
                      <div key={s} className="p-2 border rounded text-center">
                        <div className="text-xs">{new Date(s).toLocaleDateString()}</div>
                        <div className="text-xs">
                          {new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <button
                          disabled={!!taken}
                          className={`mt-2 px-2 py-1 w-full rounded ${taken ? "bg-gray-300" : "bg-blue-600 text-white"}`}
                          onClick={() => bookAppointment({ docId: viewDoc.id, slot: s })}
                        >
                          {taken ? "Booked" : "Book"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <h3 className="font-semibold mt-4 mb-2">Reviews</h3>
                <ReviewBox
                  doc={viewDoc}
                  onReview={(rating, comment) => {
                    const upd = docs.map((dd) =>
                      dd.id === viewDoc.id
                        ? { ...dd, reviews: [{ rating, comment, at: new Date().toISOString() }, ...dd.reviews] }
                        : dd
                    );
                    saveDocs(upd);
                    setViewDoc(upd.find((x) => x.id === viewDoc.id));
                    setToast("Review submitted");
                  }}
                />
              </div>
            )}
          </section>

          <aside>
            <div className="p-4 bg-white rounded shadow mb-4">
              <h3 className="font-semibold">My Appointments</h3>
              <ApptList
                appts={appts}
                docs={docs}
                auth={auth}
                onCancel={cancelAppointment}
                onPay={simulatePayment}
                onDoctorConfirm={doctorConfirm}
              />
            </div>

            <div className="p-4 bg-white rounded shadow">
              <h4 className="font-semibold">Notifications</h4>
              <div className="mt-2 space-y-2 text-xs">
                {notes.length === 0 && <div>No notifications</div>}
                {notes.map((n) => (
                  <div key={n.id} className="p-2 border rounded">
                    {n.text}
                    <div className="text-gray-400">{nowFmt(n.at)}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

        </main>
      </div>

      {toast && <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded">{toast}</div>}
    </div>
  );
}

/* -------- AUTH PANEL -------- */
function AuthPanel({ onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState("patient");
  const [specialty, setSpecialty] = useState("");
  const [loc, setLoc] = useState("");
  const [fee, setFee] = useState("");

  return (
    <div className="border p-3 rounded">
      {mode === "login" ? (
        <>
          <div className="flex gap-2">
            <input className="border p-1" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="border p-1" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={() => onLogin({ email, pass })}>
              Login
            </button>
          </div>
          <div className="text-xs mt-2">
            New user?{" "}
            <button className="text-blue-600" onClick={() => setMode("register")}>
              Register
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2 mb-2">
            <input className="border p-1 flex-1" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="border p-1" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="flex gap-2 mb-2">
            <input className="border p-1" placeholder="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <select className="border p-1" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          {role === "doctor" && (
            <div className="flex gap-2 mb-2">
              <input className="border p-1" placeholder="Specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              <input className="border p-1" placeholder="Location" value={loc} onChange={(e) => setLoc(e.target.value)} />
              <input className="border p-1" placeholder="Fee" value={fee} onChange={(e) => setFee(e.target.value)} />
            </div>
          )}

          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-green-600 text-white rounded"
              onClick={() => onRegister({ name, email, pass, role, specialty, loc, fee })}
            >
              Register
            </button>
            <button className="border px-2 py-1 rounded" onClick={() => setMode("login")}>
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* -------- Appointment List -------- */
function ApptList({ appts, docs, auth, onCancel, onPay, onDoctorConfirm }) {
  if (!auth) return <div className="text-sm text-gray-500">Login to view appointments</div>;

  let list = [];
  if (auth.role === "patient") list = appts.filter((a) => a.patientId === auth.id);
  else if (auth.role === "doctor") list = appts.filter((a) => docs.find((d) => d.id === a.docId));
  else list = appts;

  if (list.length === 0) return <div className="text-sm text-gray-500">No appointments found</div>;

  return (
    <div className="space-y-2">
      {list.map((a) => {
        const doc = docs.find((d) => d.id === a.docId) || { name: "Unknown", fee: 0 };
        return (
          <div key={a.id} className="border p-2 rounded">
            <div className="font-medium">{doc.name}</div>
            <div className="text-xs text-gray-600">{nowFmt(a.slot)}</div>
            <div className="text-xs font-bold">{a.status}</div>

            <div className="mt-2 flex gap-2">
              {auth.role === "patient" && a.status === "Pending" && (
                <button className="px-2 py-1 bg-blue-600 text-white rounded text-sm" onClick={() => onPay(a.id)}>
                  Pay ₹{doc.fee}
                </button>
              )}
              {auth.role === "patient" && a.status !== "Cancelled" && (
                <button className="px-2 py-1 border rounded text-sm" onClick={() => onCancel(a.id)}>
                  Cancel
                </button>
              )}
              {auth.role === "doctor" && a.status === "Pending" && (
                <button className="px-2 py-1 border rounded text-sm" onClick={() => onDoctorConfirm(a.id)}>
                  Confirm
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------- Review Section -------- */
function ReviewBox({ doc, onReview }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <div>
      <div className="flex gap-2">
        <select className="border p-1" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <textarea
          className="border p-1 flex-1"
          placeholder="Write review"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button
        className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
        onClick={() => {
          if (!comment.trim()) return;
          onReview(rating, comment);
          setComment("");
        }}
      >
        Submit
      </button>

      <div className="mt-2 space-y-2">
        {doc.reviews.length === 0 && <div className="text-xs text-gray-500">No reviews yet</div>}
        {doc.reviews.map((r, i) => (
          <div key={i} className="border p-2 rounded text-xs">
            <div>Rating: {r.rating}</div>
            <div>{r.comment}</div>
            <div className="text-gray-400">{nowFmt(r.at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
