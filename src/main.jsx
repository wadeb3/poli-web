import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { supabase } from "./lib/supabaseClient.js";

// ── TEMPORARY connection test ────────────────────────────────────────────
// Confirms the app can actually reach your Supabase project. Safe to delete
// once you've seen "✅ Supabase connected" in the browser console.
supabase.from("mps").select("*", { count: "exact", head: true }).then(({ count, error }) => {
  if (error) {
    console.error("❌ Supabase connection failed:", error.message);
  } else {
    console.log(`✅ Supabase connected — mps table has ${count} row(s).`);
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
