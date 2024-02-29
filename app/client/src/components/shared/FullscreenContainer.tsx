/** @jsxImportSource @emotion/react */

import * as Dialog from '@radix-ui/react-dialog';
import { WindowSize } from '@reach/window-size';
// contexts
import { useFullscreenState } from 'contexts/Fullscreen';
// types
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  description?: string;
  title?: string;
};

export default function FullscreenContainer({
  children,
  description,
  title,
}: Readonly<Props>) {
  const { fullscreenActive, setFullscreenActive } = useFullscreenState();

  return (
    <WindowSize>
      {({ width, height }) => (
        <Dialog.Root open={fullscreenActive} onOpenChange={setFullscreenActive}>
          <Dialog.Portal>
            <Dialog.Content
              css={{
                backgroundColor: 'white',
                height,
                left: 0,
                position: 'fixed',
                top: 0,
                width,
                zIndex: 1000,
              }}
              onEscapeKeyDown={(event) => {
                event.preventDefault();
              }}
            >
              {title && (
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
              )}
              {description && (
                <Dialog.Description className="sr-only">
                  {description}
                </Dialog.Description>
              )}
              {children}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </WindowSize>
  );
}
