// @flow

import React from 'react';
import styled from 'styled-components';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
// styles
import { fonts } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  padding: 1rem;

  p {
    padding-bottom: 0;
    line-height: 1.375;
  }

  a {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 1.25em;
    line-height: 1.125;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    a {
      font-size: 1.375em;
    }

    hr {
      margin-top: 2rem;
    }
  }
`;

const Question = styled.h2`
  display: block;
  margin-bottom: 0.25rem;
  font-size: 1.125em;
  line-height: 1.125;
  font-family: ${fonts.primary};
  font-weight: bold;
  padding-bottom: 0;
`;

const Item = styled.div`
  margin-top: 1rem;

  @media (min-width: 30em) {
    margin-top: 2rem;
  }

  a,
  i {
    display: inline;
  }
`;

const SubLink = styled.div`
  font-size: 0.75em;
  margin-top: 1rem;

  strong {
    display: inline-block;
  }
  a {
    display: inline-block;
  }
`;

// --- components ---
type Props = {};

function Data({ ...props }: Props) {
  React.useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.substr(1);

    // build the url for the data page
    let newHref = '';
    if (pathname) {
      newHref = href.replace(pathname, 'data');
    } else {
      newHref = `${href}data`;
    }

    // change the browser address bar without reloading the page
    window.history.pushState(null, null, newHref);

    // when the user hits the back button change the url back to the original
    return function cleanup() {
      if (pathname !== 'data') window.history.pushState(null, null, href);
    };
  }, []);

  return (
    <Container className="container">
      <p>
        <em>How’s My Waterway</em> pulls data from multiple databases at EPA and
        other federal agencies through web services. Below is a summary of data
        included in <em>How’s My Waterway</em>.
      </p>

      <hr />

      <em>Links below open in a new browser tab.</em>

      <Item>
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <a
          href="https://www.epa.gov/waterdata/attains"
          target="_blank"
          rel="noopener noreferrer"
        >
          Assessment, Total Maximum Daily Load Tracking and Implementation
          System (ATTAINS)
        </a>
        <p>
          ATTAINS contains information on water quality assessments, impaired
          waters, and total maximum daily loads (TMDLs), through data submitted
          by states under Clean Water Act sections 303(d) and 305(b).
        </p>
        <br />
        <Question>Where do I find ATTAINS data in How’s My Waterway?</Question>
        <p>
          Information from this database can be found on the Community page on
          the following tabs; Overview ({' '}
          <GlossaryTerm term="overall waterbody condition">
            waterbody condition
          </GlossaryTerm>{' '}
          list and map), Swimming, Eating Fish, Aquatic Life, Identified Issues
          ( <GlossaryTerm term="impairment">impairments</GlossaryTerm> ),
          Restore (
          <GlossaryTerm term="restoration plan">restoration plans</GlossaryTerm>{' '}
          ), Drinking Water (Which waters have been assessed for drinking water
          use?). It can also be found on the state page under the State Water
          Quality Overview and Advanced Search tabs.
        </p>
        <SubLink>
          <Question>Impairment Category Filtering Tool:</Question>{' '}
          <a href="attains" target="_blank" rel="noopener noreferrer">
            How ATTAINS data are grouped in How’s My Waterway
          </a>
        </SubLink>
      </Item>

      <hr />

      <Item>
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <a
          href="https://echo.epa.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Enforcement and Compliance History Online (ECHO)
        </a>
        <p>
          ECHO allows users to search for facilities in their community to
          assess their compliance with environmental regulations.
        </p>
        <br />
        <Question>Where do I find ECHO data in How’s My Waterway?</Question>
        <p>
          Information from this database can be found on the Community page on
          the following tabs; Overview ({' '}
          <GlossaryTerm term="dischargers">permitted dischargers</GlossaryTerm>{' '}
          ) and Identified Issues ({' '}
          <GlossaryTerm term="significant violations">
            dischargers with significant effluent violations
          </GlossaryTerm>{' '}
          ).
        </p>
      </Item>

      <hr />

      <Item>
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <a
          href="https://iaspub.epa.gov/apex/grts/f?p=grts:95"
          target="_blank"
          rel="noopener noreferrer"
        >
          Grants Reporting and Tracking System (GRTS)
        </a>
        <p>
          GRTS is the primary tool for management and oversight of the EPA’s
          Nonpoint Source (NPS) Pollution Control Program. Under Clean Water Act
          Section 319(h), EPA awards grants for implementation of state NPS
          management programs.
        </p>
        <br />
        <Question>Where do I find GRTS data in How’s My Waterway?</Question>
        <p>
          Information from this database can be found on the Community page on
          the following tabs; Restore ({' '}
          <GlossaryTerm term="Clean Water Act Section 319 Projects">
            Clean Water Act Section 319 Projects
          </GlossaryTerm>{' '}
          ), Protect (Protection Projects). On the State page under Water
          Stories.{' '}
        </p>
      </Item>

      <hr />

      <Item>
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <a
          href="https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safe Drinking Water Information System (SDWIS)
        </a>
        <p>
          The Safe Drinking Water Information System (SDWIS) contains
          information on public water systems, including monitoring,
          enforcement, and violation data related to requirements established by
          the Safe Drinking Water Act (SDWA).
        </p>
        <br />
        <Question>Where do I find SDWIS data in How’s My Waterway?</Question>
        <p>
          Information from this database can be found on the Community page on
          the following tabs; Drinking Water (Who provides the drinking water
          here?, Who withdraws water for drinking here?). On the State page
          under the Drinking Water topic (Drinking Water Information). On the
          National page under the National Drinking Water tab.
        </p>
      </Item>

      <hr />

      <Item>
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <a
          href="https://www.epa.gov/waterdata/waters-watershed-assessment-tracking-environmental-results-system"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watershed Assessment, Tracking &amp; Environmental Results System
          (WATERS)
        </a>
        <p>
          A suite of web services that provide comprehensive information about
          the quality of the nation's surface water.
        </p>
        <br />
        <Question>Where do I find WATERS data in How’s My Waterway?</Question>
        <p>
          Information from WATERS supports the display of Watershed boundaries
          on the map display.
        </p>
      </Item>

      <hr />

      <Item>
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <a
          href="https://www.waterqualitydata.us/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Water Quality Portal (WQP)
        </a>
        <p>
          The Water Quality Portal (WQP) is a cooperative service sponsored by
          the United States Geological Survey (USGS), the Environmental
          Protection Agency (EPA) and the National Water Quality Monitoring
          Council (NWQMC) that integrates publicly available water quality
          monitoring data.
        </p>
        <br />
        <Question>Where do I find WQP data in How’s My Waterway? </Question>
        <p>
          Information from this database can be found on the Community page
          under the Overview tab (monitoring locations) and under the Monitoring
          tab after performing a search.
        </p>
      </Item>
    </Container>
  );
}

export default Data;
