// @flow

import React from 'react';
import styled from 'styled-components';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import ShowLessMore from 'components/shared/ShowLessMore';
// styled components
import { StyledErrorBox } from 'components/shared/MessageBoxes';
// styles
import { colors } from 'styles/index.js';
// errors
import { stateStoriesError } from 'config/errorMessages';

// --- styled components ---
const Story = styled.div`
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

const Buttons = styled.div`
  text-align: center;
  font-size: 0.875rem;
`;

const Button = styled.button`
  margin: 0.25rem;
  color: ${colors.white()};
  background-color: ${colors.blue()};

  &:hover,
  &:focus {
    color: ${colors.white()};
    background-color: ${colors.purple()};
  }
`;

// --- components ---
type Props = {
  stories: Object,
};

function Stories({ stories }: Props) {
  const [storiesToLoad, setStoriesToLoad] = React.useState(3);

  return (
    <>
      {stories.status === 'fetching' && <LoadingSpinner />}
      {stories.status === 'failure' && (
        <StyledErrorBox>
          <p>{stateStoriesError}</p>
        </StyledErrorBox>
      )}
      {stories.status === 'success' && (
        <>
          {stories.data.length === 0 && (
            <p>There are no stories available for this state.</p>
          )}
          {stories.data.length > 0 && (
            <>
              {stories.data.slice(0, storiesToLoad).map((story, index) => (
                <Story key={index}>
                  <a
                    href={story.web_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {story.ss_title}
                  </a>
                  <p>
                    <ShowLessMore
                      text={story.ss_overview || ''}
                      charLimit={150}
                    />
                  </p>
                </Story>
              ))}
              <Buttons>
                {(storiesToLoad >= stories.data.length || storiesToLoad > 3) &&
                  stories.data.length > 3 && (
                    <Button
                      type="button"
                      className="btn btn-primary"
                      onClick={ev => setStoriesToLoad(3)}
                    >
                      View Less Stories
                    </Button>
                  )}

                {stories.data.length > 3 &&
                  storiesToLoad < stories.data.length && (
                    <Button
                      type="button"
                      className="btn"
                      onClick={ev => setStoriesToLoad(storiesToLoad + 3)}
                    >
                      View More Stories
                    </Button>
                  )}
              </Buttons>
            </>
          )}
        </>
      )}
    </>
  );
}

export default Stories;
