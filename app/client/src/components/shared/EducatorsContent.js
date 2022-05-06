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

  const links = data.links?.map((link, index) => (
    <li key={index}>
      {link.description}:
      <br />
      <a href={link.url}>{link.url}</a>
    </li>
  ));

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
          <ul>{links}</ul>
        )}
      </section>
      <section css={promptStyles}>
        <h2>
          If you're an educator, we would like to know how you're using{' '}
          <em>How's My Waterway</em>.
        </h2>
        <h3>
          Please contact us here:{' '}
          <a href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway">
            Contact Form
          </a>
        </h3>
      </section>
    </div>
  );
}

const containerStyles = css`
  font-family: ${fonts.primary};
  padding: 1rem;

  section {
    padding-bottom: 1em;
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

const promptStyles = css`
  h2,
  h3 {
    display: block;
    margin-bottom: 0.25rem;
    font-family: ${fonts.primary};
    font-weight: bold;
    padding-bottom: 0;
  }
  h2 {
    font-size: 1.125em;
    line-height: 1.125;
  }
  h3 {
    font-size: 1em;
    line-height: 1.125;
  }
`;

export default EducatorsContent;
