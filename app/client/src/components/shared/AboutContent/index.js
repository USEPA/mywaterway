// @flow

import React from 'react';
import styled from 'styled-components';
// components
import { LargeTab } from 'components/shared/ContentTabs/LargeTab.js';
import { Tabs, TabList, TabPanels, TabPanel } from '@reach/tabs';
import { GlossaryTerm } from 'components/shared/GlossaryPanel';
import { ContentTabs } from 'components/shared/ContentTabs';
// styles
import { fonts } from 'styles/index.js';

// --- styled components ---
const Container = styled.div`
  padding: 1rem;
`;

const Question = styled.strong`
  font-size: 1.2em;
`;

const StyledTabs = styled(Tabs)`
  [data-reach-tab] {
    padding: 0.875em;
  }

  [data-reach-tab-panel] {
    p {
      margin-top: 1rem;
      padding-bottom: 0.5rem;
      line-height: 1.375;

      :first-of-type {
        margin-top: 0;
      }
    }

    hr {
      margin-top: 0;
      margin-bottom: 0.5rem;
    }

    ul {
      padding-bottom: 0;
    }

    li {
      line-height: 1.375;
    }

    h3 {
      margin: 2rem 0 0.25rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.8em;

      & + p {
        margin-top: 0;
      }
    }
    h5 {
      margin: 1rem 0 0.25rem;
      padding-bottom: 0;
      font-family: ${fonts.primary};
      font-size: 1.375em;

      & + p {
        margin-top: 0;
      }
    }
  }

  /* sub tabs */
  [data-reach-tabs] {
    margin-bottom: 0.5rem;
  }
`;

// --- components ---
type Props = {};

function AboutContent({ ...props }: Props) {
  React.useEffect(() => {
    // get the original url
    const href = window.location.href;

    // get the pathname without the leading /
    const pathname = window.location.pathname.substr(1);

    // build the url for the data page
    let newHref = '';
    if (pathname) {
      newHref = href.replace(pathname, 'about');
    } else {
      newHref = `${href}about`;
    }

    // change the browser address bar without reloading the page
    window.history.pushState(null, null, newHref);

    // when the user hits the back button change the url back to the original
    return function cleanup() {
      if (pathname !== 'about') window.history.pushState(null, null, href);
    };
  }, []);

  return (
    <Container className="container">
      <ContentTabs>
        <StyledTabs>
          <TabList>
            <LargeTab>About How's My Waterway</LargeTab>
            <LargeTab>Questions and Answers</LargeTab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div className="container">
                <h3>About How’s My Waterway </h3>
                <hr />
                <p>
                  <em>How's My Waterway</em>  was designed to provide the
                  general public with information about the condition of their
                  local waters based on data that states, federal, tribal, local
                  agencies and others have provided to EPA. Water quality
                  information is displayed on 3 scales in{' '}
                  <em>How’s My Waterway</em>; community, state and national.
                  More recent or more detailed water information may exist that
                  is not yet available through EPA databases or other sources.{' '}
                </p>

                <h3> How’s My Waterway Glossary </h3>
                <hr />
                <p>
                  <em>How’s My Waterway</em> provides an easily accessible
                  plain-English glossary where you can search through
                  definitions of terms used on the site. Various words are also
                  hyperlinked throughout the site and will provide a definition
                  pop up when clicked on. The full glossary can be found at the
                  top of any page in <em>How’s My Waterway</em>.
                </p>

                <h3>How’s My Waterway Data </h3>
                <hr />
                <p>
                  <em>How’s My Waterway </em>provides a{' '}
                  <a href="/data">data page</a> which lists the sources of data
                  displayed as well as where this data shows up throughout the
                  tool. The data page can be found at the top of any page in{' '}
                  <em>How’s My Waterway</em>.
                </p>

                <h3>Community Page </h3>
                <hr />
                <h5>About impairment reporting </h5>
                <p>
                  The Clean Water Act requires States, Territories and
                  authorized tribes (states for brevity) to monitor water
                  impairments and report to EPA every two years on the waters
                  they have evaluated. This process is called{' '}
                  <GlossaryTerm term="assessment">assessment</GlossaryTerm>.
                  Part of this process is deciding which waters do not meet{' '}
                  <GlossaryTerm term="water quality standards">
                    water quality standards
                  </GlossaryTerm>
                  . These waters are called{' '}
                  <GlossaryTerm term="impaired">impaired</GlossaryTerm>{' '}
                  (impaired enough to require action) and are placed on a State
                  list for future actions to reduce pollution.  The local
                  information displayed in <em>How's My Waterway </em>
                  includes whether and when a waterway was assessed, which
                  impairments may exist, and what has been done to improve
                  conditions.
                </p>

                <h5>About water quality information </h5>
                <p>
                  EPA's water databases are the largest single, national source
                  of information about reported water quality problems and
                  efforts to fix them. Other information not directly accessible
                  in this tool exists in federal, State, local, and private
                  sources. Some of these sources appear on the{' '}
                  <a href="/data">data page</a>. Many waters in the US have not
                  been assessed and sometimes there is little or no information
                  reported about their condition. A waterway that has not been
                  assessed may or may not be{' '}
                  <GlossaryTerm term="impaired">impaired</GlossaryTerm>, and an
                  impaired waterway may have more impairments than those that
                  were measured and reported.
                </p>

                <h5>About impairment categories </h5>
                <p>
                  A single waterway can have one or more types of impairments.
                  When States report impaired waters, they put them in different
                  categories. EPA uses major categories of water impairments in
                  its national summary. There are more detailed subcategories
                  within each of these. For example, the category "Metals" may
                  include lead, cadmium, zinc, or copper as water pollutants. A
                  filtering tool for these impairments can be found on the{' '}
                  <a href="/data">data page</a>; which will allow you to find
                  out the subcategories for the impairment. 
                  <em>How's My Waterway </em> provides simple descriptions of
                  each major category, where the impairment comes from, its
                  effect on the environment and on beneficial waterway uses,
                  what citizens can do to help, and where to find more
                  information. This information can be found in the glossary.
                </p>

                <h5>About what's being done </h5>
                <p>
                  Identifying and reporting water impairments leads to action
                  for improvement. Two major types of action taken under the
                  Clean Water Act are{' '}
                  <GlossaryTerm term="tmdl">
                    Total Maximum Daily Load (TMDL) 
                  </GlossaryTerm>{' '}
                  restoration plans and{' '}
                  <GlossaryTerm term="nonpoint source pollution">
                    nonpoint source pollution
                  </GlossaryTerm>{' '}
                  projects. Tens of thousands of impaired waters now have a TMDL
                  restoration plan, which is a 'reduced pollution diet' designed
                  to help waters become healthy again. The TMDL serves as a
                  basic game plan for a variety of different restoration
                  activities, including watershed restoration plans. EPA
                  provides funds to States to help control nonpoint source
                  pollution, which generally originate from landscape runoff
                  rather than a single discharge pipe.{' '}
                  <em>How's My Waterway</em>
                   identifies whether an impaired waterway has a TMDL
                  restoration plan or a nonpoint source pollution project.
                </p>

                <h3>State Page </h3>
                <hr />
                <h5>State Water Quality Overview </h5>

                <p>
                  You will find basic facts about a state’s waters (by the
                  numbers), a paragraph about the state’s water quality program,
                  a state-wide survey of overall water quality where available,
                  state drinking water metrics, and summaries of specific water
                  assessments for the state. Links are included to state
                  websites containing more detail on water quality conditions.
                  By choosing a topic, water type and use, the page will update
                  based on the selections made. This page also provides
                  documents that the state has submitted to EPA’s ATTAINS system
                  as part of the state’s integrated report and statewide
                  statistical surveys (if applicable). Nonpoint source success
                  stories are also found on this page by state (if applicable).
                </p>

                <h5>Advanced Search</h5>

                <p>
                  On this page you will be able to find the condition of
                  waterbodies in your state all in one place. You can filter the
                  data by 303(d) listed waters, all waters, impaired waters or
                  find out which waters in the state have a TMDL. There is a
                  filtering function to filter by different parameters
                  (bacteria, acidity, abnormal flow, etc) and/or different use
                  groups (aquatic life, fish and shellfish consumption,
                  recreation, etc.). Results can be viewed on a map or in a
                  list.
                </p>

                <h3>National Page </h3>
                <hr />
                <p>
                  You will find information on the condition of water resources
                  across the nation (lakes, rivers and streams, wetlands, and
                  coastal areas), how these conditions have changed over time,
                  and the main challenges to water resources nationwide. You
                  will also find information about national drinking water and
                  how to find out if your water is safe, the number of national
                  systems in compliance and total population served.
                </p>
              </div>
            </TabPanel>
            <TabPanel>
              <div className="container">
                <h3>Questions and Answers about How’s My Waterway </h3>
                <hr />
                <p>
                  <Question>What is “How’s My Waterway?”</Question>{' '}
                  <em>How’s My Waterway</em> is an EPA tool that helps users
                  find information on the condition of their waters quickly
                  using a smart phone, tablet, or desktop computer. This
                  information is displayed on 3 scales; community, state, and
                  national. This tool for technical and non-technical users
                  offers easy access, a local-area focus, plain-English terms
                  and descriptions (see glossary), and quickly accessible
                  results within seconds based on the same comprehensive data
                  found in several EPA databases (see{' '}
                  <a href="/data">data page</a>).
                </p>

                <p>
                  <Question>How can I use How’s My Waterway?</Question> Users
                  can retrieve information on assessments and reported condition
                  of local waters for anywhere in the nation by searching based
                  on address, zipcode or place name (e.g. Mount Rushmore).
                  Results include a list and map of the waters within a small
                  watershed ({' '}
                  <GlossaryTerm term="Watershed Names (HUC 12)">
                    HUC 12 watershed
                  </GlossaryTerm>
                  ), including which waters are assessed and impaired or good
                  based on the most recent state reporting under the Clean Water
                  Act. Selecting a specific waterway from the list or map shows
                  the impairment reported, existing restoration plans, and
                  nonpoint source projects in the area. Information on permitted{' '}
                  <GlossaryTerm term="dischargers">dischargers</GlossaryTerm>,
                  water monitoring locations and drinking water systems can also
                  be found within a small watershed area after entering a
                  location.
                </p>

                <p>
                  <Question>Why was How’s My Waterway developed?</Question>{' '}
                  <em>How’s My Waterway</em> was developed to help users find
                  basic information about the condition of their waterways and
                  provides easy access to EPA’s comprehensive public water
                  quality information. The main source of data comes from EPA’s
                  national information system on water quality assessments --
                  ATTAINS -- a technical database designed for specialized
                  scientific and technical uses. For many years, EPA has
                  compiled valuable nationwide information on the condition of
                  healthy and impaired waterways, gathered through Clean Water
                  Act assessment and reporting by States and territories. To
                  many Americans, however, one local lake or stream is a more
                  important part of their lives than the thousands of waters
                  described in our national statistics. Users can use their
                  location or provide an address or area of interest to receive
                  plain-English information about waters in their local
                  watershed.
                </p>
                <p>
                  Without being experts in water quality or databases, people
                  have needed an easier way to learn about their local waters,
                  their problems and why they matter, and what’s being done to
                  improve conditions. Faced with a baffling array of scientific
                  information and complex technical databases, an average
                  citizen might say, “All I really want to know is, how’s{' '}
                  <strong>MY</strong> waterway? And please tell me in words I
                  understand.”
                </p>

                <p>
                  <Question>What are the system requirements?</Question>{' '}
                  <em>How’s My Waterway</em> is fully functional when accessed
                  through browsers such as Firefox, Google Chrome, Internet
                  Explorer and Safari using your desktop computer, tablet, or
                  smart phone. It is platform-independent.
                </p>

                <p>
                  <Question>Is How’s My Waterway a smart phone app?</Question>{' '}
                  Actually it is a mobile-friendly tool -- a smart phone or
                  tablet user can consult <em>How’s My Waterway</em> outdoors at
                  the water’s edge, and retrieve information for that specific
                  waterway with the “Use My Location” option, or search anywhere
                  in the U.S. with the "Choose a Location" option. A smart phone
                  user can save the <em>How’s My Waterway</em> link on their
                  home screen and use it just like any other phone app. However,
                  there is no app available through common app stores.
                </p>

                <p>
                  <Question>
                    More Questions?{' '}
                    <a
                      href="https://www.epa.gov/waterdata/forms/contact-us-about-hows-my-waterway"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contact us
                    </a>
                  </Question>
                </p>
              </div>
            </TabPanel>
          </TabPanels>
        </StyledTabs>
      </ContentTabs>
    </Container>
  );
}

export default AboutContent;
