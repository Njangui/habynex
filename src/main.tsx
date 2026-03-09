// src/main.tsx (VERSION CORRIGÉE)

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./services/serviceWorkerManager";

// Enregistrer le Service Worker (PAS DE ROUTER ICI)
registerServiceWorker();

// App contient DÉJÀ le Router, ne pas en mettre un autre
createRoot(document.getElementById("root")!).render(<App />);