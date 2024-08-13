/** @jsxImportSource @emotion/react */

import { css } from '@emotion/react';
import { useState } from 'react';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import ShowLessMore from 'components/shared/ShowLessMore';
// utilities
import { getExtensionFromPath } from 'utils/utils';
// styled components
import { errorBoxStyles } from 'components/shared/MessageBoxes';
// styles
import { colors } from 'styles/index';
// errors
import { stateStoriesError } from 'config/errorMessages';

const storyStyles = css`
  margin-bottom: 1.5rem;
  padding-left: 0.75rem;
  border-left: 3px solid #d8d3d3;

  a {
    font-style: italic;
    font-size: 1.0625rem;
  }

  p {
    margin-top: 0.5rem;
    padding-bottom: 0;
  }
`;

const buttonContainerStyles = css`
  text-align: center;
  font-size: 0.875rem;
`;

const buttonStyles = css`
  margin: 0.25rem;
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover,
  &:focus {
    color: ${colors.white()};
    background-color: ${colors.navyBlue()};
  }
`;

// --- components ---
type Props = {
  stories: Object;
};

function Stories({ stories }: Props) {
  const [storiesToLoad, setStoriesToLoad] = useState(3);

  return (
    <>
      {stories.status === 'fetching' && <LoadingSpinner />}
      {stories.status === 'failure' && (
        <div css={errorBoxStyles}>
          <p>{stateStoriesError}</p>
        </div>
      )}
      {stories.status === 'success' && (
        <>
          {stories.data.length === 0 && (
            <p>There are no stories available for this state.</p>
          )}
          {stories.data.length > 0 && (
            <>
              {stories.data.slice(0, storiesToLoad).map((story) => (
                <div css={storyStyles} key={story.ss_seq}>
                  <a
                    href={story.web_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {story.ss_title} ({getExtensionFromPath(story.web_link)})
                  </a>
                  <p>
                    <ShowLessMore
                      text={story.ss_overview || ''}
                      charLimit={150}
                    />
                  </p>
                </div>
              ))}
              <div css={buttonContainerStyles}>
                {(storiesToLoad >= stories.data.length || storiesToLoad > 3) &&
                  stories.data.length > 3 && (
                    <button
                      css={buttonStyles}
                      type="button"
                      className="btn btn-primary"
                      onClick={(_ev) => setStoriesToLoad(3)}
                    >
                      View Less Stories
                    </button>
                  )}

                {stories.data.length > 3 &&
                  storiesToLoad < stories.data.length && (
                    <button
                      css={buttonStyles}
                      type="button"
                      className="btn"
                      onClick={(_ev) => setStoriesToLoad(storiesToLoad + 3)}
                    >
                      View More Stories
                    </button>
                  )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default Stories;
