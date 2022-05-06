import { css } from 'styled-components/macro';
// components
import LoadingSpinner from 'components/shared/LoadingSpinner';
import { errorBoxStyles } from 'components/shared/MessageBoxes';
import { educatorContentError } from 'config/errorMessages';
import { useEducatorMaterialsContext } from 'contexts/LookupFiles';
import { usePreviousUrl } from 'utils/hooks';
// styles
import { fonts } from 'styles/index.js';

function EducatorsContent() {
  usePreviousUrl('educators');
  const { data, status: dataStatus } = useEducatorMaterialsContext();
  return (
    <div className="container" css={containerStyles}>
      <h1>Educational Materials from How's My Waterway</h1>
      <hr />
      <section>
        {dataStatus === 'fetching' ? (
          <LoadingSpinner />
        ) : dataStatus === 'failure' ? (
          <div css={modifiedErrorBoxStyles}>{educatorContentError}</div>
        ) : (
          <ul>
            {data.links.map((link, index) => (
              <li key={index}>
                {link.description}:
                <br />
                <a href={link.url}>{link.url}</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const containerStyles = css`
  font-family: ${fonts.primary};
  padding: 1rem;

  p,
  section {
    padding-bottom: 0;
    line-height: 1.375;
  }

  ul {
    padding-bottom: 0;
  }

  li {
    margin-bottom: 0.25em;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    hr {
      margin-top: 1rem;
    }
  }
`;

const modifiedErrorBoxStyles = css`
  ${errorBoxStyles}

  p {
    padding-bottom: 0;
  }
  margin-bottom: 1.25rem;
`;

export default EducatorsContent;
