/** @jsxImportSource @emotion/react */

import { Fragment, useState } from 'react';
import { css } from '@emotion/react';
// components
import FileDownloadButton from 'components/shared/FileDownloadButton';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// errors
import { waterbodyDownloadError } from 'config/errorMessages';
// styles
import { disclaimerStyles, iconStyles } from 'styles';
// types
import type { ConfigFiles } from 'contexts/ConfigFiles';
import type { AttainsProfile } from 'types';
// utils
import { titleCase } from 'utils/utils';

const filterAndDownloadStyles = css`
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 0.5em;
  width: 100%;

  .download-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    justify-content: flex-end;
    text-align: right;
  }
`;

const modifiedDisclaimerStyles = css`
  ${disclaimerStyles};

  padding-bottom: 0;
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles};
  text-align: center;
`;

const profileKeyToTitle: Record<AttainsProfile, string> = {
  actions: 'Actions',
  assessmentUnits: 'Assessment Units',
  assessments: 'Assessments',
  tmdl: 'TMDL',
};

export function WaterbodyDownload({
  configFiles,
  descriptor = 'waterbody',
  fileBaseName,
  filters,
  profile,
}: Props) {
  const [downloadError, setDownloadError] = useState(false);

  const portalUrl =
    `${configFiles?.services.expertQuery.userInterface}/attains/${profile}?` +
    Object.entries(filters)
      .map(([key, values]) => {
        if (Array.isArray(values)) {
          return values.map((value) => `${key}=${value}`).join('&');
        }
        return `${key}=${values}`;
      })
      .join('&');

  return (
    <>
      <div css={filterAndDownloadStyles}>
        <div className="filter-cell">
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-cy="portal"
          >
            <i css={iconStyles} className="fas fa-filter" aria-hidden="true" />
            Advanced Filtering
          </a>
          &nbsp;&nbsp;
          <small css={modifiedDisclaimerStyles}>(opens new browser tab)</small>
        </div>
        <div className="download-cell">
          <b>Download {titleCase(descriptor)} Data</b>
          <span>
            {(['xlsx', 'csv'] as const).map((fileType, i) => (
              <Fragment key={fileType}>
                {i !== 0 && <>&nbsp;&nbsp;</>}
                <FileDownloadButton
                  analyticsDescription={profileKeyToTitle[profile]}
                  analyticsKey="eq"
                  data={{
                    filters,
                    options: {
                      format: fileType,
                    },
                    columns: configFiles.eqProfileColumns.assessmentUnits,
                  }}
                  fileBaseName={fileBaseName}
                  fileType={fileType}
                  headers={{
                    'X-Api-Key': configFiles.services.expertQuery.apiKey,
                  }}
                  setError={setDownloadError}
                  url={`${configFiles.services.expertQuery.attains}/${profile}`}
                />
              </Fragment>
            ))}
          </span>
        </div>
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
  configFiles: ConfigFiles;
  descriptor?: string;
  fileBaseName: string;
  filters: Record<string, unknown | unknown[]>;
  profile: AttainsProfile;
};

export default WaterbodyDownload;
