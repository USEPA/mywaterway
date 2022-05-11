// @flow

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
// components
import Root from './index';

it('renders without crashing', () => {
  const rootElement: HTMLDivElement = document.createElement('div');

  render(<Root />, rootElement);
  unmountComponentAtNode(rootElement);
});
