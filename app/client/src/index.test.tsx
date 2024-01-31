import { createRoot } from 'react-dom/client';
// components
import Root from './index';

it('renders without crashing', () => {
  const rootElement: HTMLDivElement = document.createElement('div');

  const root = createRoot(rootElement);
  root.render(<Root />);
  root.unmount();
});
