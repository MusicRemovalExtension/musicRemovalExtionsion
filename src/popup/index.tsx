import { createRoot } from 'react-dom/client';

export function PopupApp() {
  return (
    <div>
      <h1>Popup</h1>
      <p>This is the popup for the Chrome extension.</p>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
