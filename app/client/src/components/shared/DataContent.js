// @flow

import React, { useEffect } from 'react';
import { css } from 'styled-components/macro';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { linkButtonStyles } from 'components/shared/LinkButton';
// styles
import { fonts } from 'styles/index.js';

function scrollToItem(id: string) {
  const item = document.getElementById(id);
  if (item) item.scrollIntoView();
}

const containerStyles = css`
  padding: 1rem;

  p {
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
      margin-top: 2rem;
    }
  }
`;

const contentsTitleStyles = css`
  padding-bottom: 16px !important;
  text-decoration: underline;
`;

const modifiedLinkButtonStyles = css`
  ${linkButtonStyles}
  font-size: 16px;
  font-weight: 400;
  text-align: left;
`;

const titleStyles = css`
  display: inline;
  line-height: 1.125;
  font-family: 'Source Sans Pro', 'Helvetica Neue', Helvetica, Roboto, Arial,
    sans-serif;

  @media (min-width: 30em) {
    font-size: 1.375em;
  }
`;

const questionStyles = css`
  display: block;
  margin-bottom: 0.25rem;
  font-size: 1.125em;
  line-height: 1.125;
  font-family: ${fonts.primary};
  font-weight: bold;
  padding-bottom: 0;
`;

const itemStyles = css`
  margin-top: 1rem;

  @media (min-width: 30em) {
    margin-top: 2rem;
  }

  a,
  i {
    display: inline;
  }
`;

function DataContent() {
  useEffect(() => {
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
      // exit early, if user clicked the banner link or the original path
      // is the data page.
      if (window.location.pathname === '/' || pathname === 'data') return;

      window.history.pushState(null, null, href);
    };
  }, []);

  return (
    <div css={containerStyles} className="container">
      <p>
        <em>How’s My Waterway</em> pulls data from multiple databases at EPA and
        other federal agencies through web services. Below is a summary of data
        included in <em>How’s My Waterway</em>.
      </p>

      <hr />

      <p css={contentsTitleStyles}>
        <strong>Contents</strong>
      </p>
      <ul>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('attains')}
          >
            Assessment, Total Maximum Daily Load Tracking and Implementation
            System (ATTAINS)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('cyan')}
          >
            Cyanobacteria Assessment Network (CyAN)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('echo')}
          >
            Enforcement and Compliance History Online (ECHO)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('grts')}
          >
            Grants Reporting and Tracking System (GRTS)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('protected-areas')}
          >
            Protected Areas
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('sdwis')}
          >
            Safe Drinking Water Information System (SDWIS)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('usgs-sensors')}
          >
            USGS Sensors (USGS Stream Gages)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('wqp')}
          >
            Water Quality Portal (WQP)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('waters')}
          >
            Watershed Assessment, Tracking &amp; Environmental Results System
            (WATERS)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('wsio')}
          >
            Watershed Index Online (WSIO)
          </button>
        </li>
        <li>
          <button
            css={modifiedLinkButtonStyles}
            onClick={() => scrollToItem('wild-scenic-rivers')}
          >
            Wild and Scenic Rivers
          </button>
        </li>
      </ul>

      <hr />

      <em>Links below open in a new browser tab.</em>

      <div css={itemStyles} id="attains">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>
          Assessment, Total Maximum Daily Load Tracking and Implementation
          System (ATTAINS)
        </h2>
        <p>
          <a
            href="https://www.epa.gov/waterdata/attains"
            target="_blank"
            rel="noopener noreferrer"
          >
            ATTAINS Data/System
          </a>
        </p>
        <p>
          ATTAINS contains information on water quality assessments, impaired
          waters, and total maximum daily loads (TMDLs), through data submitted
          by states under Clean Water Act sections{' '}
          <GlossaryTerm term="303(d) listed impaired waters (Category 5)">
            303(d)
          </GlossaryTerm>{' '}
          and 305(b).
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find ATTAINS data in How’s My Waterway?
        </h2>
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
        <br />
        <h2 css={questionStyles}>Impairment Category Filtering Tool:</h2>{' '}
        <p>
          <a href="attains" target="_blank" rel="noopener noreferrer">
            How ATTAINS data are grouped in How’s My Waterway
          </a>
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="cyan">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>Cyanobacteria Assessment Network (CyAN)</h2>
        <p>
          <a
            href="https://www.epa.gov/water-research/cyanobacteria-assessment-network-application-cyan-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            CyAN Data/System
          </a>
        </p>
        <p>
          The Cyanobacteria Assessment Network (CyAN) data provides access to{' '}
          <GlossaryTerm term="cyanobacteria">cyanobacterial</GlossaryTerm> bloom
          satellite data for over 2,000 of the largest lakes and reservoirs
          across the United States.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find CyAN data in How’s My Waterway?
        </h2>
        <p>
          Information from CyAN can be found on the Community Page in the
          Monitoring Tab under current water conditions, CyAN Satellite Imagery.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="echo">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>
          Enforcement and Compliance History Online (ECHO)
        </h2>
        <p>
          <a
            href="https://echo.epa.gov/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ECHO Data/System
          </a>
        </p>
        <p>
          ECHO allows users to search for facilities in their community to
          assess their compliance with environmental regulations.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find ECHO data in How’s My Waterway?
        </h2>
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
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="grts">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>Grants Reporting and Tracking System (GRTS)</h2>
        <p>
          <a
            href="https://iaspub.epa.gov/apex/grts/f?p=grts:95"
            target="_blank"
            rel="noopener noreferrer"
          >
            GRTS Data/System
          </a>
        </p>
        <p>
          GRTS is the primary tool for management and oversight of the EPA’s
          Nonpoint Source (NPS) Pollution Control Program. Under Clean Water Act
          Section 319(h), EPA awards grants for implementation of state NPS
          management programs.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find GRTS data in How’s My Waterway?
        </h2>
        <p>
          Information from this database can be found on the Community page on
          the following tabs; Restore ({' '}
          <GlossaryTerm term="Clean Water Act Section 319 Projects">
            Clean Water Act Section 319 Projects
          </GlossaryTerm>{' '}
          ), Protect, Watershed Health and Protection (Protection Projects). On
          the State page under Water Stories.{' '}
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="protected-areas">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>Protected Areas</h2>
        <p>
          <a
            href="https://www.usgs.gov/core-science-systems/science-analytics-and-synthesis/gap/science/protected-areas"
            target="_blank"
            rel="noopener noreferrer"
          >
            Protected Areas Data/System
          </a>
        </p>
        <p>
          The Protected Areas Database (PAD-US) is America’s official national
          inventory of U.S. terrestrial and marine protected areas that are
          dedicated to the preservation of biological diversity and to other
          natural, recreation and cultural uses, managed for these purposes
          through legal or other effective means.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find Wild and Protected Areas data in How’s My Waterway?
        </h2>
        <p>
          Information from this database can be found on the Community page on
          the protect tab under Watershed Health and Protection, Protected
          Areas.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="sdwis">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>
          Safe Drinking Water Information System (SDWIS)
        </h2>
        <p>
          <a
            href="https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting"
            target="_blank"
            rel="noopener noreferrer"
          >
            SDWIS Data/System
          </a>
        </p>
        <p>
          The Safe Drinking Water Information System (SDWIS) contains
          information on public water systems, including monitoring,
          enforcement, and violation data related to requirements established by
          the Safe Drinking Water Act (SDWA).
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find SDWIS data in How’s My Waterway?
        </h2>
        <p>
          Information from this database can be found on the Community page on
          the following tabs; Drinking Water (Who provides the drinking water
          here?, Who withdraws water for drinking here?). On the State page
          under the Drinking Water topic (Drinking Water Information). On the
          National page under the National Drinking Water tab.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="usgs-sensors">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>USGS Sensors (USGS Stream Gages)</h2>
        <p>
          <a
            href="https://waterdata.usgs.gov/nwis/rt"
            target="_blank"
            rel="noopener noreferrer"
          >
            USGS Stream Gages Data/System
          </a>
        </p>
        <p>
          Data and GIS files from the USGS current conditions can be found on
          the{' '}
          <a
            href="https://waterdata.usgs.gov/nwis/sw"
            target="_blank"
            rel="noopener noreferrer"
          >
            USGS website
          </a>
          .
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find USGS Stream Gage data in How’s My Waterway?
        </h2>
        <p>
          Information from the USGS databases can be found on the Community page
          on the Overview tab under Monitoring Locations, Current Water
          Conditions, USGS Sensors and in the Monitoring Tab under current water
          conditions, USGS Sensors.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="wqp">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>Water Quality Portal (WQP)</h2>
        <p>
          <a
            href="https://www.waterqualitydata.us/"
            target="_blank"
            rel="noopener noreferrer"
          >
            WQP Data/System
          </a>
        </p>
        <p>
          The Water Quality Portal (WQP) is a cooperative service sponsored by
          the United States Geological Survey (USGS), the Environmental
          Protection Agency (EPA) and the National Water Quality Monitoring
          Council (NWQMC) that integrates publicly available water quality
          monitoring data.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find WQP data in How’s My Waterway?{' '}
        </h2>
        <p>
          Information from this database can be found on the Community page
          under the Overview tab under Monitoring Locations, Past Water
          Conditions, and on the Monitoring tab under Past Water Conditions, as
          well as on the Monitoring Report pages.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="waters">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>
          Watershed Assessment, Tracking &amp; Environmental Results System
          (WATERS)
        </h2>
        <p>
          <a
            href="https://www.epa.gov/waterdata/waters-watershed-assessment-tracking-environmental-results-system"
            target="_blank"
            rel="noopener noreferrer"
          >
            WATERS Data/System
          </a>
        </p>
        <p>
          A suite of web services that provide comprehensive information about
          the quality of the nation's surface water.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find WATERS data in How’s My Waterway?
        </h2>
        <p>
          Information from WATERS supports the display of Watershed boundaries
          on the map display.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="wsio">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>Watershed Index Online (WSIO)</h2>
        <p>
          <a
            href="https://www.epa.gov/wsio"
            target="_blank"
            rel="noopener noreferrer"
          >
            WSIO Data/System
          </a>
        </p>
        <p>
          The Watershed Index Online (WSIO) is a free, publicly available data
          library of watershed indicators and a decision-support tool, developed
          by EPA, to assist resource managers, citizens, and other users with
          evaluating, comparing, and prioritizing watersheds for a user-defined
          purpose.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find WSIO data in How’s My Waterway?
        </h2>
        <p>
          Information from this database can be found on the Community page on
          the protect tab under Watershed Health and Protection, Watershed
          Health Scores.
        </p>
        <ScrollToTop />
      </div>

      <hr />

      <div css={itemStyles} id="wild-scenic-rivers">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <h2 css={titleStyles}>Wild and Scenic Rivers</h2>
        <p>
          <a
            href="https://www.rivers.gov/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wild and Scenic Rivers Data/System
          </a>
        </p>
        <p>
          Data and GIS files on wild and scenic rivers can be found on the{' '}
          <a
            href="https://www.rivers.gov/mapping-gis.php"
            target="_blank"
            rel="noopener noreferrer"
          >
            National Wild and Scenic Rivers System
          </a>{' '}
          website.
        </p>
        <br />
        <h2 css={questionStyles}>
          Where do I find Wild and Scenic Rivers data in How’s My Waterway?
        </h2>
        <p>
          Information from this database can be found on the Community page on
          the protect tab under Watershed Health and Protection, Wild and Scenic
          Rivers.
        </p>
        <ScrollToTop />
      </div>
    </div>
  );
}

const scrollToTopContainerStyles = css`
  padding-top: 10px;
  color: #0071bc;
`;

// --- components - ScrollToTop

type ScrollToTopProps = {
  id: string,
};

function ScrollToTop({ id }: ScrollToTopProps) {
  return (
    <div css={scrollToTopContainerStyles}>
      <div style={{ float: 'right' }}>
        <i className="fas fa-arrow-up" aria-hidden="true"></i>
        <button
          css={modifiedLinkButtonStyles}
          onClick={() => scrollToItem('hmw-nav-bar')}
        >
          Top of Page
        </button>
      </div>
    </div>
  );
}

export default DataContent;
