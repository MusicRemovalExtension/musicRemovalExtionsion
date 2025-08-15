import { createRoot } from 'react-dom/client';

export function OffscreenApp() {
  return (
    <div>
      <h1>Offscreen Page</h1>
      <p>This is the offscreen page for the Chrome extension.</p>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<OffscreenApp />);
}
