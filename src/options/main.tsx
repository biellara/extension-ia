// switches: Captura automática ON/OFF, Anonimização ON, Retenção (7/15/30), Limite (500/1000/2000).
// lê/grava no storage (através do wrapper em /common/storage).
import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")!).render(<App />);
