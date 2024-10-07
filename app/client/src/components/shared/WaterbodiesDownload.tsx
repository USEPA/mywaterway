/** @jsxImportSource @emotion/react */

import { useState } from 'react';
import { css } from '@emotion/react';
// components
import FileDownloadButton from 'components/shared/FileDownloadButton';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// contexts
import { useConfigFilesState } from 'contexts/ConfigFiles';
// errors
import { waterbodyDownloadError } from 'config/errorMessages';
// types
import type { AttainsProfile } from 'types';

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
`;

const waterbodiesDownloadSectionStyles = css`
  display: flex;
  font-weight: bold;
  gap: 0.5em;
  justify-content: flex-end;
  margin-bottom: 0.5em;
`;

const profileKeyToTitle: Record<AttainsProfile, string> = {
  actions: 'Actions',
  assessmentUnits: 'Assessment Units',
};

export function WaterbodiesDownload({
  disabled = false,
  fileBaseName,
  filters,
  profile,
}: Props) {
  const configFiles = useConfigFilesState();

  const [downloadError, setDownloadError] = useState(false);

  const services = configFiles.data.services;

  return (
    <>
      <div css={waterbodiesDownloadSectionStyles}>
        <b>
          Download All {profile === 'assessmentUnits' ? 'Waterbody' : 'Plan'}{' '}
          Data
        </b>
        {(['xlsx', 'csv'] as const).map((fileType) => (
          <FileDownloadButton
            analyticsDescription={profileKeyToTitle[profile]}
            analyticsKey="eq"
            data={{
              filters,
              options: {
                format: fileType,
              },
              columns: configFiles.data.eqProfileColumns[profile],
            }}
            disabled={disabled}
            fileBaseName={fileBaseName}
            fileType={fileType}
            headers={{ 'X-Api-Key': services.expertQuery.apiKey }}
            key={fileType}
            setError={setDownloadError}
            url={`${services.expertQuery.attains}/${profile}`}
          />
        ))}
      </div>
      {downloadError && (
        <div css={modifiedErrorBoxStyles}>
          <p>{waterbodyDownloadError}</p>
        </div>
      )}
    </>
  );
}

type Props = {
  disabled?: boolean;
  fileBaseName: string;
  filters: Record<string, unknown | unknown[]>;
  profile: AttainsProfile;
};

export default WaterbodiesDownload;
