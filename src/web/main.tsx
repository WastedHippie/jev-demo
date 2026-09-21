import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/web/App";
import "@/web/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("The app root is missing.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
