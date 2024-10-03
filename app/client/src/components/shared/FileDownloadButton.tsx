/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useRef, useState } from 'react';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { Tooltip } from 'components/shared/HelpTooltip';
// styles
import { iconButtonStyles } from 'styles';
// utils
import { fetchPost } from 'utils/fetchUtils';

/*
## Styles
*/

const fileLinkStyles = css`
  ${iconButtonStyles}
  color: #0071bc;

  svg {
    display: inline-block;
    height: auto;
    margin: 0;
    width: 12px;
  }
`;

/*
## Component
*/

export function FileDownloadButton({
  analyticsDescription,
  analyticsKey,
  disabled = false,
  fileBaseName,
  fileType,
  headers = {},
  data = {},
  setError = () => {},
  url,
}: Props) {
  const [fetching, setFetching] = useState(false);
  const triggerRef = useRef(null);

  const fetchFile = async () => {
    setFetching(true);
    try {
      setError(false);
      const blob = await fetchPost<Blob>(
        url,
        data,
        { ...headers, 'Content-Type': 'application/json' },
        60000,
        'blob',
      );

      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${fileBaseName ?? 'download'}.${fileType}`;
      link.click();
      window.URL.revokeObjectURL(link.href);

      // Log to Google Analytics
      window.logToGa('link_click', {
        event_action: `ow-hmw2-${analyticsKey}${analyticsDescription ? ' - ' + analyticsDescription : ''}`,
        event_category: 'Download',
        event_label: url,
      });
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setFetching(false);
    }
  };

  if (disabled)
    return (
      <i
        className={`fas fa-file-${fileType === 'xlsx' ? 'excel' : 'csv'}`}
        aria-hidden="true"
        style={{ color: '#ccc' }}
      />
    );
  else if (fetching)
    return (
      <span css={fileLinkStyles}>
        <LoadingSpinner />
      </span>
    );

  return (
    <Tooltip
      label={`Download ${fileType.toUpperCase()}`}
      triggerRef={triggerRef}
    >
      <button css={fileLinkStyles} onClick={fetchFile} ref={triggerRef}>
        <i
          className={`fas fa-file-${fileType === 'xlsx' ? 'excel' : 'csv'}`}
          aria-hidden="true"
        />
        <span className="sr-only">
          {`Download selected data as ${
            fileType === 'xlsx' ? 'an' : 'a'
          } ${fileType.toUpperCase()} file.`}
        </span>
      </button>
    </Tooltip>
  );
}

/*
## Types
*/

declare global {
  interface Window {
    ga: Function;
    gaTarget: string;
    logToGa: Function;
    logErrorToGa: Function;
  }
}

type Props = {
  data?: Record<string, unknown>;
  disabled?: boolean;
  analyticsDescription?: string;
  analyticsKey: string;
  fileBaseName?: string;
  fileType: 'xlsx' | 'csv';
  headers?: Record<string, string>;
  setError?: (error: boolean) => void;
  url: string;
};

export default FileDownloadButton;
