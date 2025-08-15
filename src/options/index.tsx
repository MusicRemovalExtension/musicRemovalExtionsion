import { createRoot } from "react-dom/client";

function Options() {
  return <h1>Extension Options</h1>;
}

createRoot(document.getElementById("root")!).render(<Options />);

export default Options;