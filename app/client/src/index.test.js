// @flow

import React from 'react';
import ReactDOM from 'react-dom';
// components
import Root from './index';

it('renders without crashing', () => {
  const rootElement: HTMLDivElement = document.createElement('div');

  ReactDOM.render(<Root />, rootElement);
  ReactDOM.unmountComponentAtNode(rootElement);
});
