// @flow

import React from 'react';
import styled from 'styled-components';
// components
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { LinkButton } from 'components/shared/LinkButton';
// styles
import { fonts } from 'styles/index.js';

function scrollToItem(id: string) {
  const item = document.getElementById(id);
  if (item) item.scrollIntoView();
}

// --- styled components ---
const Container = styled.div`
  padding: 1rem;

  p {
    padding-bottom: 0;
    line-height: 1.375;
  }

  @media (min-width: 30em) {
    padding: 2rem;

    hr {
      margin-top: 2rem;
    }
  }
`;

const ContentsTitle = styled.h2`
  padding: 0;
  font-size: 16px;
  font-weight: bold;
  text-decoration: underline;
`;

const StyledLinkButton = styled(LinkButton)`
  font-size: 16px;
  font-weight: 400;
`;

const TitleLink = styled.a`
  display: block;
  margin-bottom: 0.25rem;
  font-size: 1.25em;
  line-height: 1.125;

  @media (min-width: 30em) {
    font-size: 1.375em;
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
      // exit early, if user clicked the banner link or the original path
      // is the data page.
      if (window.location.pathname === '/' || pathname === 'data') return;

      window.history.pushState(null, null, href);
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

      <ContentsTitle>Contents</ContentsTitle>
      <ul>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('attains')}>
            Assessment, Total Maximum Daily Load Tracking and Implementation
            System (ATTAINS)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('echo')}>
            Enforcement and Compliance History Online (ECHO)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('grts')}>
            Grants Reporting and Tracking System (GRTS)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('protected-areas')}>
            Protected Areas
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('sdwis')}>
            Safe Drinking Water Information System (SDWIS)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('wqp')}>
            Water Quality Portal (WQP)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('waters')}>
            Watershed Assessment, Tracking &amp; Environmental Results System
            (WATERS)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('wsio')}>
            Watershed Index Online (WSIO)
          </StyledLinkButton>
        </li>
        <li>
          <StyledLinkButton onClick={() => scrollToItem('wild-scenic-rivers')}>
            Wild and Scenic Rivers
          </StyledLinkButton>
        </li>
      </ul>

      <hr />

      <em>Links below open in a new browser tab.</em>

      <Item id="attains">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.epa.gov/waterdata/attains"
          target="_blank"
          rel="noopener noreferrer"
        >
          Assessment, Total Maximum Daily Load Tracking and Implementation
          System (ATTAINS)
        </TitleLink>
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
          <TitleLink href="attains" target="_blank" rel="noopener noreferrer">
            How ATTAINS data are grouped in How’s My Waterway
          </TitleLink>
        </SubLink>
      </Item>

      <hr />

      <Item id="echo">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://echo.epa.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Enforcement and Compliance History Online (ECHO)
        </TitleLink>
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

      <Item id="grts">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://iaspub.epa.gov/apex/grts/f?p=grts:95"
          target="_blank"
          rel="noopener noreferrer"
        >
          Grants Reporting and Tracking System (GRTS)
        </TitleLink>
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
          ), Protect, Watershed Health and Protection (Protection Projects). On
          the State page under Water Stories.{' '}
        </p>
      </Item>

      <hr />

      <Item id="protected-areas">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.usgs.gov/core-science-systems/science-analytics-and-synthesis/gap/science/protected-areas"
          target="_blank"
          rel="noopener noreferrer"
        >
          Protected Areas
        </TitleLink>
        <p>
          The Protected Areas Database (PAD-US) is America’s official national
          inventory of U.S. terrestrial and marine protected areas that are
          dedicated to the preservation of biological diversity and to other
          natural, recreation and cultural uses, managed for these purposes
          through legal or other effective means.
        </p>
        <br />
        <Question>
          Where do I find Wild and Protected Areas data in How’s My Waterway?
        </Question>
        <p>
          Information from this database can be found on the Community page on
          the protect tab under Watershed Health and Protection, Protected
          Areas.
        </p>
      </Item>

      <hr />

      <Item id="sdwis">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting"
          target="_blank"
          rel="noopener noreferrer"
        >
          Safe Drinking Water Information System (SDWIS)
        </TitleLink>
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

      <Item id="wqp">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.waterqualitydata.us/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Water Quality Portal (WQP)
        </TitleLink>
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

      <hr />

      <Item id="waters">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.epa.gov/waterdata/waters-watershed-assessment-tracking-environmental-results-system"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watershed Assessment, Tracking &amp; Environmental Results System
          (WATERS)
        </TitleLink>
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

      <Item id="wsio">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.epa.gov/wsio"
          target="_blank"
          rel="noopener noreferrer"
        >
          Watershed Index Online (WSIO)
        </TitleLink>
        <p>
          The Watershed Index Online (WSIO) is a free, publicly available data
          library of watershed indicators and a decision-support tool, developed
          by EPA, to assist resource managers, citizens, and other users with
          evaluating, comparing, and prioritizing watersheds for a user-defined
          purpose.
        </p>
        <br />
        <Question>Where do I find WSIO data in How’s My Waterway?</Question>
        <p>
          Information from this database can be found on the Community page on
          the protect tab under Watershed Health and Protection, Watershed
          Health Scores.
        </p>
      </Item>

      <hr />

      <Item id="wild-scenic-rivers">
        <i className="fas fa-database" aria-hidden="true" />{' '}
        <TitleLink
          href="https://www.rivers.gov/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Wild and Scenic Rivers
        </TitleLink>
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
        <Question>
          Where do I find Wild and Scenic Rivers data in How’s My Waterway?
        </Question>
        <p>
          Information from this database can be found on the Community page on
          the protect tab under Watershed Health and Protection, Wild and Scenic
          Rivers.
        </p>
      </Item>
    </Container>
  );
}

export default Data;
